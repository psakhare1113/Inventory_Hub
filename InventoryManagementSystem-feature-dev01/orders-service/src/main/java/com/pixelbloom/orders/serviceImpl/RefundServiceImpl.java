package com.pixelbloom.orders.serviceImpl;

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
    private final PaymentFeignClient paymentClient;


    @Override
    @Transactional
    public RefundResponse refund(RefundRequest request) {

        // Validate request
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

        validateRefundStatus(orderItem, request.getBarcode());

        // Get returnReference from Return entity
        String refundReference = returnRepository.findByOrderNumber(order.getOrderNumber())
                .map(Return::getReturnReference)
                .orElseThrow(() -> new BusinessException("Return record not found for order: " + order.getOrderNumber()));

        Return returnEntity = returnRepository.findByOrderNumberAndBarcode(order.getOrderNumber(), request.getBarcode())
                .orElseThrow(() -> new BusinessException("Return record not found for order: " + order.getOrderNumber()));

        if(returnEntity.getReturnStatus()!= ReturnStatus.RETURN_APPROVED){
            throw new BusinessException("Return not approved for order: " + order.getOrderNumber());
        }

        Refund refund = Refund.builder().refundReference(refundReference).orderId(order.getId())
                .orderNumber(order.getOrderNumber()).refundStatus(RefundStatus.INITIATED)
                .refundReason(request.getRefundReason()).currency(request.getCurrency()).createdAt(LocalDateTime.now()).build();

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

        try {
            refundItemRepository.save(RefundItem.builder().refund(refund).orderItemId(orderItem.getId()).orderNumber(order.getOrderNumber())
                    .productId(orderItem.getProductId()).quantityRefunded(1).unitPrice(orderItem.getUnitPrice())
                    .refundAmount(refundAmount).createdAt(LocalDateTime.now()).build());
        } catch (Exception e) {
            log.error("Failed to save refund item", e);
            throw new BusinessException("Failed to create refund item: " + e.getMessage());
        }

        orderItem.setOrderStatus(OrderStatus.REFUNDED);
        orderItem.setUpdatedAt(LocalDateTime.now());
        orderItemRepository.save(orderItem);

        refund.setTotalRefundAmount(refundAmount);
        refund.setRefundStatus(RefundStatus.PROCESSING);
        refund.setUpdatedAt(LocalDateTime.now());
        refundRepository.save(refund);

        // Process payment refund
        try {
            paymentClient.refund(RefundPaymentRequest.builder().orderNumber(order.getOrderNumber())
                    .refundAmount(refundAmount).currency(request.getCurrency())
                    .refundReason(request.getRefundReason()).build());
            log.info("Payment refund processed for order: {}", order.getOrderNumber());
        } catch (Exception e) {
            log.error("Payment refund failed for order: {}", order.getOrderNumber(), e);
            refund.setRefundStatus(RefundStatus.FAILED);
            refundRepository.save(refund);
            throw new BusinessException("Payment refund failed: " + e.getMessage());
        }

        refund.setRefundStatus(RefundStatus.COMPLETED);
        refund.setUpdatedAt(LocalDateTime.now());
        refundRepository.save(refund);

        log.info("Refund completed successfully for order: {}, barcode: {}", order.getOrderNumber(), request.getBarcode());

        return RefundResponse.builder().refundReference(refundReference).orderNumber(refund.getOrderNumber())
                .refundStatus(refund.getRefundStatus()).totalRefundAmount(refundAmount).currency(refund.getCurrency())
                .refundedAt(refund.getUpdatedAt()).build();
    }

    private void validateRefundStatus(OrderItem orderItem, String barcode) {
        OrderStatus status = orderItem.getOrderStatus();

        if (status == OrderStatus.REFUNDED) {
            throw new RefundAlreadyProcessedException("Refund already processed for barcode: " + barcode);
        }

        if (status == OrderStatus.RETURNED) {
            throw new RefundAlreadyProcessedException("Return already processed for barcode: " + barcode);
        }

        if (status != OrderStatus.RETURN_APPROVED ) {
            throw new InvalidRefundStatusException(
                    "Item must be return approved before refund. Current status: " + status + " for barcode: " + barcode);
        }

        if (orderItem.getRefundedQuantity() >= orderItem.getQuantity()) {
            throw new RefundAlreadyProcessedException("Item already fully refunded for barcode: " + barcode);
        }
    }

}




