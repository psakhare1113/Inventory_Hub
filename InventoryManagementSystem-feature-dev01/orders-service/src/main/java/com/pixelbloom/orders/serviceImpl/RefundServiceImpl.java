package com.pixelbloom.orders.serviceImpl;

import com.pixelbloom.orders.enums.DeliveryStatus;
import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.enums.RefundStatus;
import com.pixelbloom.orders.enums.ReturnStatus;
import com.pixelbloom.orders.exception.BusinessException;
import com.pixelbloom.orders.exception.InvalidRefundStatusException;
import com.pixelbloom.orders.exception.RefundAlreadyProcessedException;
import com.pixelbloom.orders.exception.ResourceNotFoundException;
import com.pixelbloom.orders.model.*;
import com.pixelbloom.orders.repository.*;
import com.pixelbloom.orders.requestEntity.*;
import com.pixelbloom.orders.restClients.PaymentFeignClient;
import com.pixelbloom.orders.restClients.ProductsClient;
import com.pixelbloom.orders.service.RefundService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefundServiceImpl implements RefundService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final RefundRepository refundRepository;
    private final RefundItemRepository refundItemRepository;
    private final ReturnRepository returnRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;
    private final PaymentFeignClient paymentClient;
    private final ProductsClient productsClient;

    @Override
    @Transactional
    public RefundResponse refund(RefundRequest request) {

        // ── Basic validation ──────────────────────────────────────────────────
        if (request.getBarcode() == null || request.getBarcode().isEmpty()) {
            throw new BusinessException("Barcode is required for refund");
        }
        if (request.getOrderNumber() == null || request.getOrderNumber().isEmpty()) {
            throw new BusinessException("Order number is required for refund");
        }

        Order order = orderRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.getOrderNumber()));

        OrderItem orderItem = orderItemRepository.findByOrderNumberAndBarcode(order.getOrderNumber(), request.getBarcode())
                .orElseThrow(() -> new ResourceNotFoundException("Order item not found for barcode: " + request.getBarcode()));

        // ── Validate item status (must be RETURN_APPROVED) ────────────────────
        validateRefundStatus(orderItem, request.getBarcode());

        // ── Bug Fix (Case 21.2): Check refund_policies BEFORE processing ──────
        // If product's refund eligibility is false → block with clear error
        try {
            Boolean eligible = productsClient.isProductRefundEligible(
                    orderItem.getProductId(),
                    orderItem.getCategoryId(),
                    orderItem.getSubcategoryId());
            if (Boolean.FALSE.equals(eligible)) {
                throw new BusinessException(
                    "Refund not allowed: No active refund policy exists for this product/category. " +
                    "Product ID: " + orderItem.getProductId());
            }
        } catch (BusinessException e) {
            throw e; // re-throw our own validation exception
        } catch (Exception e) {
            // If products-service is unavailable, log warning and allow refund (fail-open)
            log.warn("Could not verify refund eligibility for product {} — allowing refund by default: {}",
                    orderItem.getProductId(), e.getMessage());
        }

        // ── Validate return record exists and is APPROVED ─────────────────────
        Return returnEntity = returnRepository.findByOrderNumberAndBarcode(order.getOrderNumber(), request.getBarcode())
                .orElseThrow(() -> new BusinessException(
                    "Return record not found for order: " + order.getOrderNumber() + ", barcode: " + request.getBarcode()));

        if (returnEntity.getReturnStatus() != ReturnStatus.RETURN_APPROVED) {
            throw new BusinessException(
                "Return must be approved before refund. Current status: " + returnEntity.getReturnStatus());
        }

        String refundReference = returnEntity.getReturnReference();

        // ── Create Refund record ──────────────────────────────────────────────
        Refund refund = Refund.builder()
                .refundReference(refundReference)
                .customerId(order.getCustomerId())
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .refundStatus(RefundStatus.INITIATED)
                .refundReason(request.getRefundReason())
                .currency(request.getCurrency())
                .refundMethod(request.getRefundMethod() != null ? request.getRefundMethod().toUpperCase() : "ONLINE")
                .createdAt(LocalDateTime.now())
                .build();

        try {
            refundRepository.save(refund);
            log.info("Refund initiated for order: {}, barcode: {}", order.getOrderNumber(), request.getBarcode());
        } catch (Exception e) {
            log.error("Failed to save refund record", e);
            throw new BusinessException("Failed to initiate refund: " + e.getMessage());
        }

        BigDecimal refundAmount = orderItem.getUnitPrice();
        if (refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Invalid refund amount for barcode: " + request.getBarcode());
        }

        // ── Create RefundItem record ──────────────────────────────────────────
        try {
            refundItemRepository.save(RefundItem.builder()
                    .refund(refund)
                    .orderItemId(orderItem.getId())
                    .orderNumber(order.getOrderNumber())
                    .productId(orderItem.getProductId())
                    .quantityRefunded(1)
                    .unitPrice(orderItem.getUnitPrice())
                    .refundAmount(refundAmount)
                    .createdAt(LocalDateTime.now())
                    .build());
        } catch (Exception e) {
            log.error("Failed to save refund item", e);
            throw new BusinessException("Failed to create refund item: " + e.getMessage());
        }

        // ── Update order item status ──────────────────────────────────────────
        orderItem.setOrderStatus(OrderStatus.REFUNDED);
        orderItem.setUpdatedAt(LocalDateTime.now());
        orderItemRepository.save(orderItem);

        refund.setTotalRefundAmount(refundAmount);
        refund.setRefundStatus(RefundStatus.PROCESSING);
        refund.setUpdatedAt(LocalDateTime.now());
        refundRepository.save(refund);

        // ── Bug Fix (400 error): payment_transactions may not have a record ───
        // Scenario: COD orders, or Razorpay orders where orderNumber was null at
        // payment time (saved with razorpayOrderId instead of orderNumber).
        // In such cases, payment-service throws RuntimeException("Payment not found")
        // which Feign wraps and causes a 400 here.
        // Fix: treat "payment not found" as a non-fatal case — refund is still
        // recorded in ordersdb; no gateway reversal needed for COD/missing records.
        boolean isCashRefund = "CASH".equalsIgnoreCase(refund.getRefundMethod());
        if (isCashRefund) {
            // Cash refund — no payment gateway reversal needed.
            // Create a DeliveryAssignment task so the delivery boy knows to visit
            // the customer and hand back cash physically.
            log.info("Cash refund selected for order: {} — creating delivery boy cash-handback task", order.getOrderNumber());

            // Find the delivery boy who originally delivered this order
            deliveryAssignmentRepository
                .findTopByOrderNumberOrderByAssignedAtDesc(order.getOrderNumber())
                .ifPresentOrElse(
                    originalAssignment -> {
                        DeliveryAssignment cashTask = DeliveryAssignment.builder()
                            .orderNumber(order.getOrderNumber())
                            .deliveryBoyId(originalAssignment.getDeliveryBoyId())
                            .deliveryBoyName(originalAssignment.getDeliveryBoyName())
                            .deliveryStatus(DeliveryStatus.CASH_REFUND_PENDING)
                            .isCashRefundTask(true)
                            .refundReference(refundReference)
                            .cashRefundAmount(refundAmount)
                            .assignedAt(LocalDateTime.now())
                            .build();
                        deliveryAssignmentRepository.save(cashTask);
                        log.info("Cash refund task created for delivery boy {} on order {}",
                            originalAssignment.getDeliveryBoyId(), order.getOrderNumber());
                    },
                    () -> {
                        // No delivery assignment found — create unassigned task (admin will assign)
                        DeliveryAssignment cashTask = DeliveryAssignment.builder()
                            .orderNumber(order.getOrderNumber())
                            .deliveryBoyId(0L) // 0 = unassigned, admin must assign
                            .deliveryBoyName("Unassigned")
                            .deliveryStatus(DeliveryStatus.CASH_REFUND_PENDING)
                            .isCashRefundTask(true)
                            .refundReference(refundReference)
                            .cashRefundAmount(refundAmount)
                            .assignedAt(LocalDateTime.now())
                            .build();
                        deliveryAssignmentRepository.save(cashTask);
                        log.warn("No delivery boy found for order {} — cash refund task created as unassigned", order.getOrderNumber());
                    }
                );
        } else {
            try {
                paymentClient.refund(RefundPaymentRequest.builder()
                        .orderNumber(order.getOrderNumber())
                        .refundAmount(refundAmount)
                        .currency(request.getCurrency())
                        .refundReason(request.getRefundReason())
                        .paymentSource("ONLINE")
                        .build());
                log.info("Payment refund processed for order: {}", order.getOrderNumber());
            } catch (Exception e) {
                String errMsg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
                boolean isPaymentNotFound = errMsg.contains("payment not found")
                        || errMsg.contains("404")
                        || errMsg.contains("not found");

                if (isPaymentNotFound) {
                    // COD order or payment record missing — complete refund without gateway reversal
                    log.warn("No payment transaction found for order {} — completing refund without gateway reversal (COD or missing record)",
                            order.getOrderNumber());
                } else {
                    // Real payment gateway failure — mark as FAILED and surface the error
                    log.error("Payment refund failed for order: {}", order.getOrderNumber(), e);
                    refund.setRefundStatus(RefundStatus.FAILED);
                    refundRepository.save(refund);
                    throw new BusinessException("Payment refund failed: " + e.getMessage());
                }
            }
        }

        // ── Mark refund as COMPLETED ──────────────────────────────────────────
        refund.setRefundStatus(RefundStatus.COMPLETED);
        refund.setUpdatedAt(LocalDateTime.now());
        refundRepository.save(refund);

        log.info("Refund completed successfully for order: {}, barcode: {}", order.getOrderNumber(), request.getBarcode());

        return RefundResponse.builder()
                .refundReference(refundReference)
                .orderNumber(refund.getOrderNumber())
                .refundStatus(refund.getRefundStatus())
                .totalRefundAmount(refundAmount)
                .currency(refund.getCurrency())
                .refundMethod(refund.getRefundMethod())
                .refundedAt(refund.getUpdatedAt())
                .build();
    }

    private void validateRefundStatus(OrderItem orderItem, String barcode) {
        OrderStatus status = orderItem.getOrderStatus();

        if (status == OrderStatus.REFUNDED) {
            throw new RefundAlreadyProcessedException("Refund already processed for barcode: " + barcode);
        }

        if (status == OrderStatus.RETURNED) {
            throw new RefundAlreadyProcessedException("Return already processed for barcode: " + barcode);
        }

        if (status != OrderStatus.RETURN_APPROVED) {
            throw new InvalidRefundStatusException(
                    "Item must be return approved before refund. Current status: " + status + " for barcode: " + barcode);
        }

        if (orderItem.getRefundedQuantity() >= orderItem.getQuantity()) {
            throw new RefundAlreadyProcessedException("Item already fully refunded for barcode: " + barcode);
        }
    }
}
