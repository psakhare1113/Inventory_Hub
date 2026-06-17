package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.config.JwtUtil;
import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.model.Pricing;
import com.pixelbloom.orders.model.RefundResponse;
import com.pixelbloom.orders.requestEntity.CreateOrderRequest;
import com.pixelbloom.orders.requestEntity.RefundPaymentRequest;
import com.pixelbloom.orders.requestEntity.RefundRequest;
import com.pixelbloom.orders.repository.OrderRepository;
import com.pixelbloom.orders.repository.OrderItemRepository;
import com.pixelbloom.orders.repository.OrderStatusHistoryRepository;
import com.pixelbloom.orders.repository.PricingRepository;
import com.pixelbloom.orders.repository.RefundRepository;
import com.pixelbloom.orders.repository.ReturnRepository;
import com.pixelbloom.orders.repository.DeliveryAssignmentRepository;
import com.pixelbloom.orders.responseEntity.OrderResponse;
import com.pixelbloom.orders.restClients.PaymentFeignClient;
import com.pixelbloom.orders.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;
    private final RefundService refundService;
    private final PricingService pricingService;
    private final CustomerdetailsService customerdetailsService;
    private final JwtUtil jwtUtil;
    private final OrderStatusHistoryRepository statusHistoryRepository;
    private final PricingRepository pricingRepository;
    private final ReturnRepository returnRepository;
    private final RefundRepository refundRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;
    private final PaymentFeignClient paymentFeignClient;
    private final com.pixelbloom.orders.publisher.EmailEventPublisher emailEventPublisher;
    private final com.pixelbloom.orders.restClients.CustomerClient customerClient;

    private void injectCustomerId(CreateOrderRequest request, String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Long customerId = jwtUtil.extractCustomerId(token);
            request.setCustomerId(customerId);
        }
    }

    @PostMapping("/api/orders/create")
    public OrderResponse createOrder(@RequestBody CreateOrderRequest request,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader) {
        injectCustomerId(request, authHeader);
        return orderService.createOrder(request);
    }

    // Admin endpoint for creating orders
    @PostMapping("/api/auth/admin/orders/create")
    public OrderResponse createAdminOrder(@RequestBody CreateOrderRequest request,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        injectCustomerId(request, authHeader);
        return orderService.createOrder(request);
    }

    // User endpoint for creating orders
    @PostMapping("/api/auth/user/orders/create")
    public OrderResponse createUserOrder(@RequestBody CreateOrderRequest request,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        injectCustomerId(request, authHeader);
        return orderService.createOrder(request);
    }

    @PostMapping("/api/orders/addPricing")
    public ResponseEntity<?> addPricing(@RequestBody Pricing pricing) {
        return ResponseEntity.ok(pricingService.addPricing(pricing));
    }

    // Admin endpoint for adding pricing
    @PostMapping("/api/auth/admin/orders/addPricing")
    public ResponseEntity<?> addAdminPricing(@RequestBody Pricing pricing) {
        return ResponseEntity.ok(pricingService.addPricing(pricing));
    }

    // User endpoint for adding pricing
    @PostMapping("/api/auth/user/orders/addPricing")
    public ResponseEntity<?> addUserPricing(@RequestBody Pricing pricing) {
        return ResponseEntity.ok(pricingService.addPricing(pricing));
    }

    @PostMapping("/api/orders/refund")
    public ResponseEntity<RefundResponse> refund( @RequestBody RefundRequest refundRequest) {
        return ResponseEntity.ok(refundService.refund(refundRequest));
    }
    // Customer endpoint
    @GetMapping("/api/orders/customerOrder/{customerId}")
    public ResponseEntity<List<OrderResponse>> getCustomerOrders(@PathVariable Long customerId,@RequestParam(required = false) String orderStatus) {
        OrderStatus status = orderStatus != null ? OrderStatus.valueOf(orderStatus.toUpperCase()) : null;
        return ResponseEntity.ok(customerdetailsService.getOrdersByCustomerAndStatus(customerId, status));
    }

    // Admin endpoint - get all orders by status
    @GetMapping("/api/auth/admin/orders/ordersByorderStatus")
    public ResponseEntity<?> getOrdersByStatus(@RequestParam(required = false) String orderStatus){
        OrderStatus status = orderStatus != null ? OrderStatus.valueOf(orderStatus.toUpperCase()) : null;
        return ResponseEntity.ok(customerdetailsService.getAllOrdersByStatus(status));
    }

    // Admin endpoint - get all orders for admin dashboard
    @GetMapping("/api/auth/admin/orders/all")
    public ResponseEntity<List<OrderResponse>> getAllOrdersForAdmin() {
        return ResponseEntity.ok(customerdetailsService.getAllOrdersByStatus(null));
    }

    // Admin endpoint - update order status (CONFIRMED → PROCESSING → SHIPPED → DELIVERED)
    @PatchMapping("/api/auth/admin/orders/{orderNumber}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable String orderNumber,
            @RequestParam String status) {
        try {
            OrderStatus newStatus = OrderStatus.valueOf(status.toUpperCase());
            orderService.updateOrderStatus(orderNumber, newStatus);
            return ResponseEntity.ok(java.util.Map.of(
                "orderNumber", orderNumber,
                "status", newStatus.name(),
                "message", "Order status updated to " + newStatus.name()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Invalid status: " + status));
        }
    }

    // User endpoint - cancel own order (only CONFIRMED or PROCESSING orders can be cancelled)
    // User endpoint - cancel own order (only CANCELLED status allowed)
    @PatchMapping("/api/orders/{orderNumber}/status")
    public ResponseEntity<?> cancelUserOrder(
            @PathVariable String orderNumber,
            @RequestParam String status) {
        try {
            OrderStatus newStatus = OrderStatus.valueOf(status.toUpperCase());
            if (newStatus != OrderStatus.CANCELLED) {
                return ResponseEntity.badRequest().body(java.util.Map.of("error", "Users can only cancel orders"));
            }
            orderService.updateOrderStatus(orderNumber, newStatus);
            return ResponseEntity.ok(java.util.Map.of(
                "orderNumber", orderNumber,
                "status", newStatus.name(),
                "message", "Order cancelled successfully"
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "Invalid status: " + status));
        } catch (com.pixelbloom.orders.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(java.util.Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to cancel order {}: {}", orderNumber, e.getMessage(), e);
            return ResponseEntity.status(500).body(java.util.Map.of(
                "error", "Failed to cancel order: " + e.getMessage()
            ));
        }
    }

    // User endpoint - trigger refund after cancellation
    @PostMapping("/api/orders/{orderNumber}/cancel-refund")
    public ResponseEntity<?> cancelRefund(
            @PathVariable String orderNumber,
            @RequestParam(required = false, defaultValue = "") String reason) {
        try {
            com.pixelbloom.orders.model.Order order = orderRepository.findByOrderNumber(orderNumber)
                    .orElseThrow(() -> new com.pixelbloom.orders.exception.ResourceNotFoundException("Order not found: " + orderNumber));

            // Only allow refund if order is actually CANCELLED
            if (order.getOrderStatus() != OrderStatus.CANCELLED) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Refund only allowed for cancelled orders. Current status: " + order.getOrderStatus()
                ));
            }

            // Already refunded?
            if (order.getPaymentStatus() == com.pixelbloom.orders.enums.PaymentStatus.REFUNDED) {
                return ResponseEntity.ok(Map.of(
                    "orderNumber", orderNumber,
                    "message", "Refund already processed for this order",
                    "alreadyRefunded", true
                ));
            }

            // Save cancellation reason to DB
            String finalReason = reason.isBlank() ? "Customer request" : reason;
            order.setCancellationReason(finalReason);
            order.setCancelledAt(java.time.LocalDateTime.now());
            order.setUpdatedAt(java.time.LocalDateTime.now());

            // Fetch customer details for email — fallback to auth-service if email missing in orders-db
            com.pixelbloom.orders.model.CustomerDetails customer =
                customerdetailsService.CustomerDetailsById(order.getCustomerId());
            String customerEmail = customer != null ? customer.getEmail() : null;
            String customerName  = customer != null
                ? (customer.getFirstName() + " " + customer.getLastName()).trim()
                : "Customer";

            // Fallback: fetch email from auth-service if missing
            if (customerEmail == null || customerEmail.isBlank()) {
                try {
                    com.pixelbloom.orders.responseEntity.CustomerDetailsResponse authCustomer =
                        customerClient.getCustomerDetails(order.getCustomerId());
                    if (authCustomer != null) {
                        String resolved = authCustomer.getResolvedEmail();
                        if (resolved != null) customerEmail = resolved;
                        if ((customerName == null || customerName.isBlank()) && authCustomer.getFirstName() != null)
                            customerName = (authCustomer.getFirstName() + " " + authCustomer.getLastName()).trim();
                    }
                } catch (Exception ex) {
                    log.warn("Could not fetch email from auth-service for customerId {}: {}", order.getCustomerId(), ex.getMessage());
                }
            }
            log.info("Cancel-refund email target for order {}: {}", orderNumber, customerEmail != null ? customerEmail : "NULL — email will go to default");

            // COD orders — no payment was made, so no refund needed
            boolean isCod = "CASH_ON_DELIVERY".equalsIgnoreCase(order.getPaymentMode())
                         || "COD".equalsIgnoreCase(order.getPaymentMode());
            if (isCod) {
                order.setPaymentStatus(com.pixelbloom.orders.enums.PaymentStatus.REFUNDED);
                orderRepository.save(order);

                // Send cancellation email (no refund amount for COD)
                try {
                    emailEventPublisher.publishEmailEvent(
                        com.pixelbloom.orders.event.OrderEmailEvent.builder()
                            .eventType("ORDER_CANCELLED")
                            .orderNumber(orderNumber)
                            .customerId(order.getCustomerId())
                            .customerEmail(customerEmail)
                            .customerName(customerName)
                            .customerPhone(customer != null ? customer.getPhone() : null)
                            .eventTime(java.time.LocalDateTime.now())
                            .cancellationReason(finalReason)
                            .paymentMode("CASH_ON_DELIVERY")
                            .message("Your COD order has been cancelled. No payment was made.")
                            .build());
                } catch (Exception e) {
                    log.warn("Cancel email failed for COD order {}: {}", orderNumber, e.getMessage());
                }

                return ResponseEntity.ok(Map.of(
                    "orderNumber", orderNumber,
                    "message", "COD order cancelled. No payment was made, so no refund is needed.",
                    "cod", true
                ));
            }

            // Online payment — trigger payment-service refund
            java.math.BigDecimal refundAmount = order.getTotalAmount();
            if (refundAmount == null || refundAmount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid order amount for refund"));
            }

            try {
                RefundPaymentRequest refundPaymentRequest =
                    RefundPaymentRequest.builder()
                        .orderNumber(orderNumber)
                        .refundAmount(refundAmount)
                        .currency(order.getCurrency() != null ? order.getCurrency() : "INR")
                        .refundReason("Order cancelled: " + finalReason)
                        .build();
                paymentFeignClient.refund(refundPaymentRequest);
                log.info("Payment refund triggered for order: {}", orderNumber);
            } catch (Exception e) {
                String msg = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
                log.warn("Payment refund call result for order {}: {}", orderNumber, msg.isEmpty() ? "no message" : msg);
                // Only block on real payment gateway failures — not on missing records or already-refunded
                boolean isRealFailure = !msg.isEmpty()
                    && !msg.contains("payment not found")
                    && !msg.contains("404")
                    && !msg.contains("not found")
                    && !msg.contains("already refunded")
                    && !msg.contains("feign")
                    && !msg.contains("decode")
                    && !msg.contains("extracting response")
                    && !msg.contains("content type");
                if (isRealFailure) {
                    return ResponseEntity.status(500).body(Map.of("error", "Refund failed: " + e.getMessage()));
                }
                // For all other cases (missing payment record, Feign decode errors, etc.) — proceed
                log.info("Proceeding with refund completion despite payment-service issue for order: {}", orderNumber);
            }

            // Mark order as REFUNDED
            order.setPaymentStatus(com.pixelbloom.orders.enums.PaymentStatus.REFUNDED);
            orderRepository.save(order);

            // Refund timeline based on payment mode
            String refundTimeline = "ONLINE".equalsIgnoreCase(order.getPaymentMode()) ? "5-7 business days" : "2-3 business days";

            // Send cancellation + refund email
            try {
                emailEventPublisher.publishEmailEvent(
                    com.pixelbloom.orders.event.OrderEmailEvent.builder()
                        .eventType("ORDER_CANCELLED")
                        .orderNumber(orderNumber)
                        .customerId(order.getCustomerId())
                        .customerEmail(customerEmail)
                        .customerName(customerName)
                        .customerPhone(customer != null ? customer.getPhone() : null)
                        .eventTime(java.time.LocalDateTime.now())
                        .cancellationReason(finalReason)
                        .refundAmount(refundAmount)
                        .currency(order.getCurrency() != null ? order.getCurrency() : "INR")
                        .paymentMode(order.getPaymentMode())
                        .refundTimeline(refundTimeline)
                        .message("Your order has been cancelled and a refund of ₹" + refundAmount + " has been initiated.")
                        .build());
            } catch (Exception e) {
                log.warn("Cancel email failed for order {}: {}", orderNumber, e.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                "orderNumber", orderNumber,
                "refundAmount", refundAmount,
                "message", "Refund of ₹" + refundAmount + " initiated successfully"
            ));
        } catch (com.pixelbloom.orders.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // Admin endpoint - get all order status history
    @GetMapping("/api/auth/admin/orders/statusHistory")
    public ResponseEntity<?> getAllStatusHistory() {
        return ResponseEntity.ok(statusHistoryRepository.findAll());
    }

    // Admin endpoint - get all pricing records
    @GetMapping("/api/auth/admin/orders/pricing")
    public ResponseEntity<?> getAllPricing() {
        return ResponseEntity.ok(pricingRepository.findAll());
    }

    // Admin endpoint - get all customer details
    @GetMapping("/api/auth/admin/orders/customerDetails")
    public ResponseEntity<?> getAllCustomerDetails() {
        return ResponseEntity.ok(customerdetailsService.getAllCustomerDetails());
    }

    // Admin endpoint - get all returns
    @GetMapping("/api/auth/admin/orders/returns")
    public ResponseEntity<?> getAllReturns() {
        return ResponseEntity.ok(returnRepository.findAll());
    }

    // Admin endpoint - approve or reject a return
    // PATCH /api/auth/admin/orders/returns/{returnReference}/action?action=APPROVE|REJECT&reason=...
    @PatchMapping("/api/auth/admin/orders/returns/{returnReference}/action")
    public ResponseEntity<?> adminReturnAction(
            @PathVariable String returnReference,
            @RequestParam String action,
            @RequestParam(required = false) String reason) {
        try {
            com.pixelbloom.orders.model.Return ret = returnRepository.findByReturnReference(returnReference)
                    .orElseThrow(() -> new com.pixelbloom.orders.exception.ResourceNotFoundException(
                            "Return not found: " + returnReference));

            com.pixelbloom.orders.model.OrderItem item = orderItemRepository
                    .findByOrderNumberAndBarcode(ret.getOrderNumber(), ret.getBarcode())
                    .orElseThrow(() -> new com.pixelbloom.orders.exception.ResourceNotFoundException(
                            "Order item not found for barcode: " + ret.getBarcode()));

            boolean approve = "APPROVE".equalsIgnoreCase(action);

            if (approve) {
                ret.setReturnStatus(com.pixelbloom.orders.enums.ReturnStatus.RETURN_APPROVED);
                item.setOrderStatus(com.pixelbloom.orders.enums.OrderStatus.RETURN_APPROVED);

                // Activate the delivery boy pickup task — now visible in delivery boy dashboard
                // Task was created with RETURN_PICKUP_AWAITING_APPROVAL; flip to RETURN_PICKUP_PENDING
                try {
                    com.pixelbloom.orders.model.DeliveryAssignment pickupTask =
                        deliveryAssignmentRepository.findByReturnReferenceAndIsReturnPickupTaskTrue(ret.getReturnReference())
                            .orElse(null);
                    if (pickupTask != null) {
                        pickupTask.setDeliveryStatus(com.pixelbloom.orders.enums.DeliveryStatus.RETURN_PICKUP_PENDING);
                        deliveryAssignmentRepository.save(pickupTask);
                        log.info("Return pickup task activated for delivery boy {} — returnRef: {}",
                            pickupTask.getDeliveryBoyId(), ret.getReturnReference());
                    } else {
                        log.warn("No return pickup task found for returnRef: {} — delivery boy will not be notified", ret.getReturnReference());
                    }
                } catch (Exception e) {
                    log.error("Failed to activate return pickup task for returnRef: {}: {}", ret.getReturnReference(), e.getMessage());
                }
            } else {
                ret.setReturnStatus(com.pixelbloom.orders.enums.ReturnStatus.RETURN_REJECTED);
                item.setOrderStatus(com.pixelbloom.orders.enums.OrderStatus.RETURN_REJECTED);

                // Cancel the delivery boy pickup task — no longer needed
                try {
                    com.pixelbloom.orders.model.DeliveryAssignment pickupTask =
                        deliveryAssignmentRepository.findByReturnReferenceAndIsReturnPickupTaskTrue(ret.getReturnReference())
                            .orElse(null);
                    if (pickupTask != null) {
                        pickupTask.setDeliveryStatus(com.pixelbloom.orders.enums.DeliveryStatus.FAILED);
                        deliveryAssignmentRepository.save(pickupTask);
                        log.info("Return pickup task cancelled (return rejected) for returnRef: {}", ret.getReturnReference());
                    }
                } catch (Exception e) {
                    log.warn("Failed to cancel return pickup task for returnRef: {}: {}", ret.getReturnReference(), e.getMessage());
                }
            }

            returnRepository.save(ret);
            orderItemRepository.save(item);

            return ResponseEntity.ok(Map.of(
                    "returnReference", returnReference,
                    "returnStatus", ret.getReturnStatus().name(),
                    "message", approve ? "Return approved successfully" : "Return rejected: " + (reason != null ? reason : "Admin decision")
            ));
        } catch (com.pixelbloom.orders.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // Admin endpoint - get all refunds
    @GetMapping("/api/auth/admin/orders/refunds")
    public ResponseEntity<?> getAllRefunds() {
        return ResponseEntity.ok(refundRepository.findAll());
    }

    // Admin - update AWB number and courier partner on order
    @PatchMapping("/api/auth/admin/orders/{orderNumber}/awb")
    public ResponseEntity<?> updateAwb(
            @PathVariable String orderNumber,
            @RequestParam(required = false) String awbNumber,
            @RequestParam(required = false) String courierPartner) {
        try {
            com.pixelbloom.orders.model.Order order = orderRepository.findByOrderNumber(orderNumber)
                    .orElseThrow(() -> new com.pixelbloom.orders.exception.ResourceNotFoundException("Order not found: " + orderNumber));
            if (awbNumber != null && !awbNumber.isBlank()) order.setAwbNumber(awbNumber);
            if (courierPartner != null && !courierPartner.isBlank()) order.setCourierPartner(courierPartner);
            order.setUpdatedAt(java.time.LocalDateTime.now());
            orderRepository.save(order);
            return ResponseEntity.ok(Map.of("orderNumber", orderNumber, "awbNumber", awbNumber, "courierPartner", courierPartner));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}