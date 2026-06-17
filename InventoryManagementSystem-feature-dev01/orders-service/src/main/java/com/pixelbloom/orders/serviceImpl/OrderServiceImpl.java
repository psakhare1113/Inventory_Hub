package com.pixelbloom.orders.serviceImpl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.orders.enums.AggregateType;
import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.enums.PaymentStatus;


import com.pixelbloom.orders.event.InvoiceEvent;
import com.pixelbloom.orders.event.OrderCreatedEvent;
import com.pixelbloom.orders.event.OrderEmailEvent;
import com.pixelbloom.orders.exception.BusinessException;
import com.pixelbloom.orders.exception.DownstreamServiceException;
import com.pixelbloom.orders.exception.InventoryReservationException;
import com.pixelbloom.orders.exception.PricingException;
import com.pixelbloom.orders.exception.ResourceNotFoundException;
import com.pixelbloom.orders.model.*;

import com.pixelbloom.orders.publisher.EmailEventPublisher;
import com.pixelbloom.orders.publisher.InvoiceEventPublisher;
import com.pixelbloom.orders.publisher.OrderEventPublisher;
import com.pixelbloom.orders.repository.OrderItemRepository;
import com.pixelbloom.orders.repository.OrderOutboxRepository;
import com.pixelbloom.orders.repository.OrderRepository;
import com.pixelbloom.orders.repository.OrderStatusHistoryRepository;


import com.pixelbloom.orders.requestEntity.*;
import com.pixelbloom.orders.responseEntity.OrderItemResponse;
import com.pixelbloom.orders.responseEntity.OrderResponse;
import com.pixelbloom.orders.responseEntity.PaymentResponse;
import com.pixelbloom.orders.restClients.*;
import com.pixelbloom.orders.restClients.AuthServiceClient;
import com.pixelbloom.orders.restClients.WarehouseClient;
import com.pixelbloom.orders.service.*;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RequiredArgsConstructor
@Service
@Slf4j
@Transactional
public class OrderServiceImpl implements OrderService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository statusHistoryRepository;
    private final OrderOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final InventoryClientF inventoryClient;
        private final OrderPubSubService orderPubSubService;
    private final InvoiceService invoiceService;
    private final EmailEventPublisher emailEventPublisher;
     private final PricingService pricingService;
    private final CustomerdetailsService customerdetailsService;
    private final PaymentFeignClient paymentClient;
    private final AuthServiceClient authServiceClient;
    private final WarehouseClient warehouseClient;
    private final ProductsClient productsClient;


    /**
     * Main order creation flow - orchestrates the complete order processing workflow
     * Sequence: 1→2→3→4→5 (with rollback on failure)
     */
    public OrderResponse createOrder(CreateOrderRequest request) {
        String orderNumber = UUID.randomUUID().toString();
        Order order = null;
        boolean inventoryReserved = false;

        try {
            // Step 1: Persist order and items to database
            order = persistOrder(request, orderNumber);
            List<OrderItem> orderItems = orderItemRepository.findByOrderNumber(order.getOrderNumber());

            // Step 2: Reserve inventory from external inventory service
            reserveInventory(orderNumber, orderItems);
            inventoryReserved = true;

            // Step 3: Process payment through external payment service
            makePayment(orderNumber, order);
           //step 4: confirm item SOLD /SALE at inventory
            confirmInventorySale(order);
            try {
                // Step 5: Finalize order (update status, publish events, confirm inventory)
                String warningMessage = finalizeOrder(order.getId());

                // Step 6.1: Build and return response with or without warning
                if (warningMessage != null) {

                    return buildCreateOrderResponseWithWarning(order, orderItems, warningMessage);
                } else {   //Step 6.2: Build and return response for happy path
                    return buildCreateOrderResponse(order, orderItems);
                }
            } catch (Exception e) {
                // Handle messaging failures gracefully
                if (isMessagingFailure(e)) {
                    log.warn("Order created successfully but messaging failed: {}", e.getMessage());
                    return buildCreateOrderResponseWithWarning(order, orderItems, "Order created but notifications may be delayed");
                }
                throw e;
            }
        } catch (InventoryReservationException ex) {
            log.error("Order creation failed due to insufficient inventory: {}", ex.getMessage());

            // Mark order as failed (no inventory was reserved, so no release needed)
            if (order != null) {
                markOrderFailed(order, ex.getMessage());
                // Notify customer that product is out of stock
                sendOutOfStockEmail(order, ex.getMessage());
            }
            throw ex;
        } catch (Exception ex) {
            log.error("Order creation failed. Root cause: ", ex);

            //  // Handle messaging failures gracefully -perform Rollback: Release inventory if it was reserved and mark order as failed
            if (inventoryReserved && order != null) {
                releaseInventoryOnFailure(order);
                markOrderFailed(order, ex.getMessage());
            }
            throw ex;
        }
    }

    /**
     * Send out-of-stock notification email to customer
     */
    private void sendOutOfStockEmail(Order order, String reason) {
        try {
            CustomerDetails customer = customerdetailsService.CustomerDetailsById(order.getCustomerId());
            String customerName = customer != null
                    ? (customer.getFirstName() + " " + customer.getLastName()).trim()
                    : "Customer";
            String customerEmail = resolveCustomerEmail(customer, order.getCustomerId());

            emailEventPublisher.publishEmailEvent(
                    OrderEmailEvent.builder()
                            .eventType("OUT_OF_STOCK")
                            .orderNumber(order.getOrderNumber())
                            .customerId(order.getCustomerId())
                            .customerName(customerName)
                            .customerEmail(customerEmail)
                            .customerPhone(customer != null ? customer.getPhone() : null)
                            .eventTime(LocalDateTime.now())
                            .message("Sorry, the product you requested is currently out of stock. " +
                                     "We will notify you once stock is available. Details: " + reason)
                            .build()
            );
            log.info("Out-of-stock email notification sent for order: {}", order.getOrderNumber());
        } catch (Exception e) {
            log.warn("Failed to send out-of-stock email for order {}: {}", order.getOrderNumber(), e.getMessage());
        }
    }

    /**
     * Step 2: Reserve inventory for order items
     * Calls external inventory service to reserve stock
     * After reservation, updates order_items with actual barcodes assigned by inventory service
     */
    public void reserveInventory(String orderNumber, List<OrderItem> orderItems) {
        try {
            ReserveItemResponse reserveResponse = inventoryClient.reserveInventory(buildReserveRequest(orderNumber, orderItems));

            // ✅ Update order_items with actual barcodes from inventory service
            // This ensures return flow works correctly (inventory barcode = order_item barcode)
            if (reserveResponse != null && reserveResponse.getItems() != null) {
                // Group reserved items by productId for matching
                Map<Long, List<InventoryReservedItemDto>> reservedByProduct = new HashMap<>();
                for (InventoryReservedItemDto dto : reserveResponse.getItems()) {
                    reservedByProduct.computeIfAbsent(dto.getProductId(), k -> new ArrayList<>()).add(dto);
                }

                // Match each order item to its reserved inventory barcode
                Map<Long, Integer> productIndexMap = new HashMap<>();
                for (OrderItem item : orderItems) {
                    List<InventoryReservedItemDto> reserved = reservedByProduct.get(item.getProductId());
                    if (reserved != null && !reserved.isEmpty()) {
                        int idx = productIndexMap.getOrDefault(item.getProductId(), 0);
                        if (idx < reserved.size()) {
                            String actualBarcode = reserved.get(idx).getBarcode();
                            item.setBarcode(actualBarcode); // ✅ Set actual inventory barcode
                            productIndexMap.put(item.getProductId(), idx + 1);
                            log.info("Order item barcode updated: productId={}, barcode={}", item.getProductId(), actualBarcode);
                        }
                    }
                }
                orderItemRepository.saveAll(orderItems); // ✅ Save updated barcodes
            }
        } catch (FeignException.BadRequest e) {
            // Extract actual message from inventory service response
            String msg = e.contentUTF8();
            if (msg != null && msg.contains("Insufficient stock")) {
                throw new InventoryReservationException(msg.contains("\"message\"")
                        ? msg.replaceAll(".*\"message\":\"([^\"]+)\".*", "$1")
                        : "Insufficient inventory for the requested products");
            }
            log.error("Inventory bad request: {}", msg);
            throw new InventoryReservationException("Insufficient inventory for the requested products");
        } catch (FeignException.NotFound e) {
            throw new ResourceNotFoundException("Inventory not found");
        } catch (FeignException.ServiceUnavailable e) {
            throw new DownstreamServiceException("Inventory service unavailable", 503);
        } catch (FeignException e) {
            log.error("Feign error: {}", e.getMessage());
            throw new DownstreamServiceException("Inventory service error: " + e.status(), e.status());
        }
    }

    /**
     * Step 3: Process payment for the order
     * Calls external payment service to charge customer
     */



    private void makePayment(String orderNumber, Order order) {
        // Skip internal payment call for ONLINE payments — already verified via Razorpay
        if ("ONLINE".equalsIgnoreCase(order.getPaymentMode())) {
            log.info("Skipping internal payment call for ONLINE order {} — already paid via Razorpay", orderNumber);
            return;
        }

        // COD: no gateway call — payment collected at delivery door
        // Just record a PENDING transaction for audit; failure is non-critical
        if ("CASH_ON_DELIVERY".equalsIgnoreCase(order.getPaymentMode())) {
            log.info("COD order {} — recording PENDING payment, will be collected at delivery", orderNumber);
            try {
                paymentClient.pay(
                        PaymentRequest.builder()
                                .orderNumber(orderNumber)
                                .amount(order.getTotalAmount())
                                .currency(order.getCurrency())
                                .paymentMethod("CASH_ON_DELIVERY")
                                .build()
                );
            } catch (Exception e) {
                // Non-critical — COD record failure must not block order creation
                log.warn("Could not record COD payment transaction for order {}: {}", orderNumber, e.getMessage());
            }
            return;
        }

        // Internal gateway payment (future use for other payment modes)
        try {
            PaymentResponse paymentResponse = paymentClient.pay(
                    PaymentRequest.builder()
                            .orderNumber(orderNumber)
                            .amount(order.getTotalAmount())
                            .currency(order.getCurrency())
                            .paymentMethod(order.getPaymentMode())
                            .build()
            );

            if (!paymentResponse.isSuccess()) {
                throw new BusinessException("Payment failed: " + paymentResponse.getFailureReason());
            }
        } catch (FeignException.BadRequest e) {
            throw new BusinessException("Payment failed: Invalid payment details");
        } catch (FeignException.NotFound e) {
            throw new ResourceNotFoundException("Payment service not found");
        } catch (FeignException.ServiceUnavailable e) {
            throw new DownstreamServiceException("Payment service unavailable", 503);
        } catch (FeignException e) {
            log.error("Payment service error: {}", e.getMessage());
            throw new BusinessException("Payment processing failed");
        }
    }

    /**
     * Rollback operation: Release reserved inventory when order fails
     */
    public void releaseInventoryOnFailure(Order order) {
        try {
            inventoryClient.releaseReservation(buildReleaseRequest(order));
        } catch (Exception e) {
            log.error("Failed to release inventory for orderNumber {}", order.getOrderNumber(), e);
        }
    }

    /**
     * Resolve customer email: orders DB first, auth-server as fallback.
     * Uses direct HTTP call (not Feign) to avoid routing issues.
     */
    private String resolveCustomerEmail(CustomerDetails customer, Long customerId) {
        String email = customer != null ? customer.getEmail() : null;
        // Skip fake/test emails from customer_details table
        if (email != null && (email.endsWith("@example.com") || email.isBlank())) {
            email = null;
        }
        if (email == null || email.isBlank()) {
            try {
                java.util.Map<String, Object> authCustomer = authServiceClient.getCustomerById(customerId);
                if (authCustomer != null) {
                    Object emailObj = authCustomer.get("email");
                    if (emailObj == null) emailObj = authCustomer.get("customerEmail");
                    if (emailObj != null && !emailObj.toString().isBlank()) {
                        email = emailObj.toString();
                        log.info("Resolved email from auth-server for customerId {}: {}", customerId, email);
                    }
                }
            } catch (Exception e) {
                log.warn("Could not resolve email from auth-server for customerId {}: {}", customerId, e.getMessage());
            }
        }
        return email;
    }

    /**
     * Check if exception is related to messaging/Kafka failures
     */
    private boolean isMessagingFailure(Exception e) {
        if (e == null || e.getMessage() == null) return true;
        String msg = e.getMessage().toLowerCase();
        // Kafka / messaging related failures — order should still succeed
        return msg.contains("kafka") ||
               msg.contains("messaging") ||
               msg.contains("producer") ||
               msg.contains("topic") ||
               msg.contains("broker") ||
               msg.contains("connection refused") ||
               msg.contains("failed to send") ||
               msg.contains("timeout") ||
               msg.contains("not present in metadata") ||
               msg.contains("send failed") ||
               e.getClass().getName().toLowerCase().contains("kafka");
    }
    /**
     * Map OrderItem entities to OrderItemResponse DTOs
     */
    private List<OrderItemResponse> mapToOrderItemResponses(List<OrderItem> items) {
        return items.stream()
                .map(item -> OrderItemResponse.builder()
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .barcode(item.getBarcode())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .orderStatus(item.getOrderStatus())
                        .build())
                .toList();
    }

    /**
     * Step 1: Persist order and items to database
     * Sub-sequence: 1.1→1.2→1.3
     */
    @Transactional
    protected Order persistOrder(CreateOrderRequest request, String orderNumber) {
        // Step 1.1: Create and save order entity (without total amount)
        Order order = Order.builder()
                .orderNumber(orderNumber)
                .customerId(request.getCustomerId())
                .orderStatus(OrderStatus.CREATED)
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMode(request.getPaymentMode())
                .currency("INR")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        order = orderRepository.saveAndFlush(order);

        // Step 1.2: Create order items and calculate subtotal
        BigDecimal itemsTotal = saveItems(order.getId(), orderNumber, request);

        // Step 1.3: Full checkout amount breakdown
        // ── Shipping (dynamic from shipping-service, fallback ₹50) ──────────
        BigDecimal shipping;
        if (request.getShippingCharge() != null && request.getShippingCharge().compareTo(BigDecimal.ZERO) > 0) {
            shipping = request.getShippingCharge();
            log.info("Using dynamic shipping charge from request: ₹{} (courier: {}, pincode: {})",
                    shipping, request.getCourierPartner(), request.getDeliveryPincode());
        } else {
            shipping = BigDecimal.valueOf(50);
            log.info("No shipping charge in request — using default ₹50");
        }

        // ── GST — per-product rate from request items, fallback 18% flat ────
        BigDecimal gst = calculateGst(request, itemsTotal);

        // ── Warehouse handling cost (default ₹15) ───────────────────────────
        BigDecimal warehouseHandling = (request.getWarehouseHandlingCost() != null
                && request.getWarehouseHandlingCost().compareTo(BigDecimal.ZERO) > 0)
                ? request.getWarehouseHandlingCost()
                : BigDecimal.valueOf(15);

        // ── Packaging cost (default ₹20) ─────────────────────────────────────
        BigDecimal packaging = (request.getPackagingCost() != null
                && request.getPackagingCost().compareTo(BigDecimal.ZERO) > 0)
                ? request.getPackagingCost()
                : BigDecimal.valueOf(20);

        // ── Last-mile delivery cost (default ₹40) ────────────────────────────
        BigDecimal delivery = (request.getDeliveryCost() != null
                && request.getDeliveryCost().compareTo(BigDecimal.ZERO) > 0)
                ? request.getDeliveryCost()
                : BigDecimal.valueOf(40);

        // ── Platform fee (default ₹10) ───────────────────────────────────────
        BigDecimal platformFee = (request.getPlatformFee() != null
                && request.getPlatformFee().compareTo(BigDecimal.ZERO) > 0)
                ? request.getPlatformFee()
                : BigDecimal.valueOf(10);

        // ── Discount (validated — cannot exceed subtotal) ────────────────────
        BigDecimal discount = BigDecimal.ZERO;
        if (request.getDiscountAmount() != null && request.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            discount = request.getDiscountAmount().min(itemsTotal); // cap at subtotal
            log.info("Discount applied: ₹{} (coupon: {})", discount, request.getCouponCode());
        }

        // ── Final total ──────────────────────────────────────────────────────
        // Total = subtotal + shipping + GST + warehouseHandling + packaging + delivery + platformFee - discount
        BigDecimal totalAmount = itemsTotal
                .add(shipping)
                .add(gst)
                .add(warehouseHandling)
                .add(packaging)
                .add(delivery)
                .add(platformFee)
                .subtract(discount)
                .max(BigDecimal.ZERO); // never negative

        log.info("Order {} breakdown: subtotal=₹{} shipping=₹{} gst=₹{} warehouse=₹{} packaging=₹{} delivery=₹{} platform=₹{} discount=₹{} TOTAL=₹{}",
                orderNumber, itemsTotal, shipping, gst, warehouseHandling, packaging, delivery, platformFee, discount, totalAmount);

        // Step 1.4: Update order with full breakdown
        order.setSubtotal(itemsTotal);
        order.setTaxAmount(gst);
        order.setShippingCharge(shipping);
        order.setWarehouseHandlingCost(warehouseHandling);
        order.setPackagingCost(packaging);
        order.setDeliveryCost(delivery);
        order.setPlatformFee(platformFee);
        order.setDiscountAmount(discount);
        order.setCouponCode(request.getCouponCode());
        order.setTotalAmount(totalAmount);
        order.setCourierPartner(request.getCourierPartner());
        order.setDeliveryPincode(request.getDeliveryPincode());
        order.setDeliverySpeed(request.getDeliverySpeed());
        order.setUpdatedAt(LocalDateTime.now());

        return orderRepository.save(order);
    }

    /**
     * Calculate GST using per-product rates from request items.
     * Each item must send gstRate from frontend (fetched from pricing API).
     * If item has no gstRate or gstRate = 0 → that item contributes ₹0 GST.
     * No flat fallback — GST is accurate per product category.
     *
     * Indian GST slabs: 0% (food/essentials), 5% (clothes), 12%, 18% (electronics), 28% (luxury)
     */
    private BigDecimal calculateGst(CreateOrderRequest request, BigDecimal itemsTotal) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalGst = BigDecimal.ZERO;
        for (CreateOrderItemRequest item : request.getItems()) {
            // No gstRate or 0% → this product is GST-exempt (e.g. food, essentials)
            if (item.getGstRate() == null || item.getGstRate() <= 0) continue;
            try {
                Optional<com.pixelbloom.orders.model.Pricing> pricingOpt = pricingService.getLatestPriceByProductId(item.getProductId());
                if (pricingOpt.isPresent() && pricingOpt.get().getUnitPrice() != null) {
                    com.pixelbloom.orders.model.Pricing pricing = pricingOpt.get();
                    BigDecimal lineTotal = pricing.getUnitPrice()
                            .multiply(BigDecimal.valueOf(item.getQuantity()));
                    BigDecimal lineGst = lineTotal
                            .multiply(BigDecimal.valueOf(item.getGstRate() / 100.0))
                            .setScale(2, java.math.RoundingMode.HALF_UP);
                    totalGst = totalGst.add(lineGst);
                    log.info("GST for product {}: unitPrice=₹{} qty={} gstRate={}% lineGst=₹{}",
                            item.getProductId(), pricing.getUnitPrice(), item.getQuantity(), item.getGstRate(), lineGst);
                }
            } catch (Exception e) {
                log.warn("Could not fetch pricing for product {} for GST calc: {}", item.getProductId(), e.getMessage());
            }
        }
        return totalGst;
    }

    /**
     * Mark order as failed and update status history
     */
    @Transactional
    protected void markOrderFailed(Order order, String reason) {
        // Prevent overwriting confirmed orders
        if (order.getOrderStatus() == OrderStatus.CONFIRMED) {
            return;
        }order.setOrderStatus(OrderStatus.FAILED);
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);
        saveStatusHistory(order, OrderStatus.FAILED.name(), reason);
    }

    /**
     * Build inventory release request for rollback operations
     */
    private InventoryReleaseRequest buildReleaseRequest(Order order) {
        List<String> barcodes = orderItemRepository.findByOrderNumber(order.getOrderNumber())
                .stream()
                .map(OrderItem::getBarcode)
                .toList();

        return InventoryReleaseRequest.builder()
                .orderNumber(order.getOrderNumber())
                .barcodes(barcodes)
                .build();
    }

    /**
     * Build inventory reservation request for Step 2
     */
    private InventoryReserveRequest buildReserveRequest(String orderNumber, List<OrderItem> orderItems) {
        Map<String, Integer> itemCounts = new HashMap<>();
        Map<String, OrderItem> itemDetails = new HashMap<>();

        // Group items by product key and count quantities
        for (OrderItem item : orderItems) {
            String key = item.getProductId() + "-" + item.getCategoryId() + "-" + item.getSubcategoryId();
            itemCounts.put(key, itemCounts.getOrDefault(key, 0) + 1);
            itemDetails.put(key, item);
        }

        // Build items list without lambda to avoid effectively-final issues
        List<InventoryItemRequest> inventoryItems = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : itemCounts.entrySet()) {
            OrderItem item = itemDetails.get(entry.getKey());
            inventoryItems.add(InventoryItemRequest.builder()
                    .productId(item.getProductId())
                    .categoryId(item.getCategoryId())
                    .subcategoryId(item.getSubcategoryId())
                    .quantity(entry.getValue())
                    .build());
        }

        return InventoryReserveRequest.builder()
                .orderNumber(orderNumber)
                .items(inventoryItems)
                .build();
    }

    /**
     * Step 1.2: Save order items and return items subtotal
     * Resolves unit price from pricing service, expands quantity into individual records
     */
    private BigDecimal saveItems(Long orderId, String orderNumber, CreateOrderRequest request) {
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CreateOrderItemRequest i : request.getItems()) {
            // Resolve unit price from pricing service
            BigDecimal unitPrice;
            try {
                Optional<com.pixelbloom.orders.model.Pricing> pricingOpt = pricingService.getLatestPriceByProductId(i.getProductId());
                if (pricingOpt.isPresent() && pricingOpt.get().getUnitPrice() != null) {
                    unitPrice = pricingOpt.get().getUnitPrice();
                } else {
                    throw new PricingException("No pricing found for product " + i.getProductId());
                }
            } catch (PricingException pe) {
                throw pe;
            } catch (Exception e) {
                log.warn("Pricing lookup failed for product {}: {}", i.getProductId(), e.getMessage());
                // Fallback: create default pricing entry
                BigDecimal defaultPrice = BigDecimal.valueOf(100);
                try {
                    com.pixelbloom.orders.model.Pricing defaultPricing = new com.pixelbloom.orders.model.Pricing();
                    defaultPricing.setProductId(i.getProductId());
                    defaultPricing.setUnitPrice(defaultPrice);
                    defaultPricing.setCurrency("INR");
                    defaultPricing.setEffectiveDate(LocalDateTime.now());
                    pricingService.addPricing(defaultPricing);
                    log.info("Created default pricing for product {}", i.getProductId());
                } catch (Exception e2) {
                    log.warn("Failed to create default pricing for product {}: {}", i.getProductId(), e2.getMessage());
                }
                unitPrice = defaultPrice;
            }

            // Resolve GST rate: from request item → 0 (exempt, orders-service Pricing has no gstRate)
            final BigDecimal itemGstRate;
            final BigDecimal itemGstAmount;
            if (i.getGstRate() != null && i.getGstRate() > 0) {
                itemGstRate = BigDecimal.valueOf(i.getGstRate());
            } else {
                // orders-service Pricing model has no gstRate field — treat as exempt
                itemGstRate = BigDecimal.ZERO;
            }
            // GST amount per unit = unitPrice × gstRate / 100
            itemGstAmount = unitPrice
                    .multiply(itemGstRate)
                    .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);

            log.info("Item GST: product={} unitPrice=₹{} gstRate={}% gstAmount=₹{}",
                    i.getProductId(), unitPrice, itemGstRate, itemGstAmount);

            // Create one record per unit (quantity expansion)
            for (int q = 0; q < i.getQuantity(); q++) {
                OrderItem item = OrderItem.builder()
                        .orderId(orderId)
                        .orderNumber(orderNumber)
                        .productId(i.getProductId())
                        .categoryId(i.getCategoryId())
                        .subcategoryId(i.getSubcategoryId())
                        .barcode(i.getProductBarcode())
                        .quantity(1)
                        .unitPrice(unitPrice)
                        .totalPrice(unitPrice)
                        .gstRate(itemGstRate)
                        .gstAmount(itemGstAmount)
                        .orderStatus(OrderStatus.CONFIRMED)
                        .paymentStatus(PaymentStatus.SUCCESS)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                orderItems.add(item);
                totalAmount = totalAmount.add(unitPrice);
            }
        }

        orderItemRepository.saveAll(orderItems);
        return totalAmount;
    }

    /**
     * Save order status change to history table for audit trail
     */
    private void saveStatusHistory(Order order, String status, String remarks) {
        try {
            OrderStatusHistory history = OrderStatusHistory.builder()
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .previousStatus(order.getOrderStatus() != null ? order.getOrderStatus().name() : null)
                    .status(status)
                    .remarks(remarks)
                    .changedBy("SYSTEM")
                    .createdAt(LocalDateTime.now())
                    .changedAt(LocalDateTime.now())
                    .build();
            statusHistoryRepository.save(history);
        } catch (Exception e) {
            log.warn("Failed to save status history for order {}: {}", order.getOrderNumber(), e.getMessage());
        }
    }

    /**
     * Mark order as delivered - called by external delivery service
     */
    @Override
    @Transactional   // this is used to shipping-service where it returns back response to order service that order is delivered
    //ShipmentDeliveredEventListener listen to shipping event and triigers this method
    public void markOrderDelivered(String orderNumber, LocalDateTime deliveredAt) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));

        // Update order status
        order.setOrderStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(deliveredAt);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        // Update all order items
        List<OrderItem> orderItems = orderItemRepository.findByOrderNumber(orderNumber);
        orderItems.forEach(item -> {
            item.setOrderStatus(OrderStatus.DELIVERED);
            item.setDeliveredAt(deliveredAt);
            item.setUpdatedAt(LocalDateTime.now());
        });
        orderItemRepository.saveAll(orderItems);

        // Publish delivery notification event
        try {
            CustomerDetails deliveryCustomer = customerdetailsService.CustomerDetailsById(order.getCustomerId());
            String deliveryCustomerName = deliveryCustomer != null
                    ? (deliveryCustomer.getFirstName() + " " + deliveryCustomer.getLastName()).trim()
                    : "Customer";
            String deliveryCustomerEmail = resolveCustomerEmail(deliveryCustomer, order.getCustomerId());
            String deliveryCustomerPhone = deliveryCustomer != null ? deliveryCustomer.getPhone() : null;

            emailEventPublisher.publishEmailEvent(
                    OrderEmailEvent.builder()
                            .eventType("ORDER_DELIVERED")
                            .orderNumber(orderNumber)
                            .customerId(order.getCustomerId())
                            .customerName(deliveryCustomerName)
                            .customerEmail(deliveryCustomerEmail)
                            .customerPhone(deliveryCustomerPhone)
                            .eventTime(deliveredAt)
                            .message("Your order has been delivered successfully.")
                            .build()
            );
        } catch (Exception e) {
            log.warn("Failed to send delivery email for order {}: {}", orderNumber, e.getMessage());
        }

        saveStatusHistory(order, OrderStatus.DELIVERED.name(), "Order delivered successfully");
        log.info("Order {} and {} items marked as DELIVERED", orderNumber, orderItems.size());
    }

    /**
     * Admin: Update order status manually (CONFIRMED → PROCESSING → SHIPPED → DELIVERED)
     */
    @Override
    @Transactional
    public void updateOrderStatus(String orderNumber, OrderStatus newStatus) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));

        OrderStatus oldStatus = order.getOrderStatus();
        order.setOrderStatus(newStatus);
        order.setUpdatedAt(LocalDateTime.now());

        if (newStatus == OrderStatus.DELIVERED) {
            order.setDeliveredAt(LocalDateTime.now());

            // COD: payment is collected at the door — mark as SUCCESS on delivery
            if ("CASH_ON_DELIVERY".equalsIgnoreCase(order.getPaymentMode())
                    && order.getPaymentStatus() == PaymentStatus.PENDING) {
                order.setPaymentStatus(PaymentStatus.SUCCESS);
                log.info("COD order {} delivered — payment status updated to SUCCESS", orderNumber);
            }
        }

        // CANCELLED → release reserved/sold inventory back to AVAILABLE (real-time restock)
        if (newStatus == OrderStatus.CANCELLED) {
            try {
                inventoryClient.releaseReservation(buildReleaseRequest(order));
                log.info("Inventory released (restocked) for cancelled order: {}", orderNumber);
            } catch (Exception e) {
                log.error("Failed to release inventory for cancelled order {}: {}", orderNumber, e.getMessage(), e);
                // Don't block cancellation — inventory release failure is non-fatal
            }
        }

        // PACKED → auto-generate packing slip number
        if (newStatus == OrderStatus.PACKED && order.getPackingSlipNumber() == null) {
            String packingSlip = "PKG-" + java.time.LocalDate.now().getYear()
                    + "-" + String.format("%05d", order.getId());
            order.setPackingSlipNumber(packingSlip);
            log.info("Packing slip generated for order {}: {}", orderNumber, packingSlip);
        }

        orderRepository.save(order);

        // Update all order items status
        List<OrderItem> orderItems = orderItemRepository.findByOrderNumber(orderNumber);
        final LocalDateTime deliveredAtTime = (newStatus == OrderStatus.DELIVERED) ? LocalDateTime.now() : null;
        orderItems.forEach(item -> {
            item.setOrderStatus(newStatus);
            item.setUpdatedAt(LocalDateTime.now());
            // Set deliveredAt on each item when order is marked DELIVERED
            // This is critical for the 15-day return window check
            if (deliveredAtTime != null && item.getDeliveredAt() == null) {
                item.setDeliveredAt(deliveredAtTime);
            }
        });
        orderItemRepository.saveAll(orderItems);

        // PROCESSING → pick list is now auto-created at order CONFIRMED (finalizeOrder step 5.1.2)
        // No additional action needed here — warehouse manager was already notified at order placement

        // Send email notification for key status changes
        if (newStatus == OrderStatus.PACKED || newStatus == OrderStatus.SHIPPED || newStatus == OrderStatus.DELIVERED) {
            try {
                CustomerDetails statusCustomer = customerdetailsService.CustomerDetailsById(order.getCustomerId());
                String statusCustomerName = statusCustomer != null
                        ? (statusCustomer.getFirstName() + " " + statusCustomer.getLastName()).trim()
                        : "Customer";
                String statusCustomerEmail = resolveCustomerEmail(statusCustomer, order.getCustomerId());
                String statusCustomerPhone = statusCustomer != null ? statusCustomer.getPhone() : null;

                String eventType = newStatus == OrderStatus.PACKED ? "ORDER_PACKED"
                        : newStatus == OrderStatus.SHIPPED ? "ORDER_SHIPPED" : "ORDER_DELIVERED";
                String statusMessage = newStatus == OrderStatus.PACKED
                        ? "Your order has been packed and is ready for dispatch."
                        : newStatus == OrderStatus.SHIPPED
                        ? "Your order has been shipped and is on its way."
                        : "Your order has been delivered successfully.";
                emailEventPublisher.publishEmailEvent(
                        OrderEmailEvent.builder()
                                .eventType(eventType)
                                .orderNumber(orderNumber)
                                .customerId(order.getCustomerId())
                                .customerName(statusCustomerName)
                                .customerEmail(statusCustomerEmail)
                                .customerPhone(statusCustomerPhone)
                                .eventTime(LocalDateTime.now())
                                .message(statusMessage)
                                .build()
                );
            } catch (Exception e) {
                log.warn("Failed to send status update email for order {}: {}", orderNumber, e.getMessage());
            }
        }

        saveStatusHistory(order, newStatus.name(), "Status updated from " + oldStatus.name() + " to " + newStatus.name());
        log.info("Order {} status updated: {} → {}", orderNumber, oldStatus, newStatus);
    }

    /**
     * Step 5: Finalize order after successful payment   // Step 5: Finalize order (update status, publish events, confirm inventory)
     * Sub-sequence: 5.1→ 5.2→ 5.3→ 5.4 → 5.5→ 5.6
     */
    @Transactional
    protected String finalizeOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        // Step 5.1: Update order status to confirmed
        // For COD: paymentStatus stays PENDING (cash collected at delivery)
        // For ONLINE: paymentStatus = SUCCESS (already paid via Razorpay)
        order.setOrderStatus(OrderStatus.CONFIRMED);
        order.setPaymentStatus(
            "CASH_ON_DELIVERY".equalsIgnoreCase(order.getPaymentMode())
                ? PaymentStatus.PENDING
                : PaymentStatus.SUCCESS
        );
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

        // Step 5.1.1: Auto-assign warehouse from first order item's barcode
        try {
            List<OrderItem> itemsForWarehouse = orderItemRepository.findByOrderNumber(order.getOrderNumber());
            if (!itemsForWarehouse.isEmpty()) {
                String firstBarcode = itemsForWarehouse.get(0).getBarcode();
                java.util.Map<String, Object> warehouseInfo = null;
                try {
                    warehouseInfo = inventoryClient.getWarehouseByBarcode(firstBarcode);
                } catch (Exception barcodeEx) {
                    log.warn("Barcode warehouse lookup failed for order {} barcode {}: {}", order.getOrderNumber(), firstBarcode, barcodeEx.getMessage());
                }
                if (warehouseInfo != null) {
                    Object wId = warehouseInfo.get("warehouseId");
                    Object wName = warehouseInfo.get("warehouseName");
                    if (wId != null) order.setWarehouseId(Long.valueOf(wId.toString()));
                    if (wName != null) order.setWarehouseName(wName.toString());
                    log.info("Warehouse assigned for order {}: {} ({})", order.getOrderNumber(), wName, wId);
                } else {
                    // Fallback: assign to the default active warehouse via warehouse-service
                    assignFallbackWarehouse(order);
                }
                orderRepository.save(order);
            }
        } catch (Exception e) {
            log.warn("Could not auto-assign warehouse for order {}: {}", order.getOrderNumber(), e.getMessage());
        }

        // Step 5.1.2: Auto-notify Warehouse Manager + create PickList directly on CONFIRMED
        // Admin has no "Mark Processing" button — goes to warehouse manager as soon as order is CONFIRMED
        try {
            List<OrderItem> itemsForPickList = orderItemRepository.findByOrderNumber(order.getOrderNumber());
            List<Map<String, Object>> pickItems = new ArrayList<>();
            for (OrderItem item : itemsForPickList) {
                String productName = "Product #" + item.getProductId();
                try {
                    Map<String, Object> productDetails = productsClient.getProductById(item.getProductId());
                    if (productDetails != null) {
                        Object name = productDetails.get("productName");
                        if (name == null) name = productDetails.get("name");
                        if (name != null && !name.toString().isBlank()) {
                            productName = name.toString();
                        }
                    }
                } catch (Exception pe) {
                    log.warn("⚠️ Could not fetch product name for productId {} — using fallback: {}", item.getProductId(), pe.getMessage());
                }
                Map<String, Object> pickItem = new HashMap<>();
                pickItem.put("productId", item.getProductId());
                pickItem.put("productName", productName);
                pickItem.put("barcode", item.getBarcode());
                pickItem.put("quantity", item.getQuantity());
                pickItem.put("locationCode", "");
                pickItem.put("locationId", null);
                pickItems.add(pickItem);
            }
            warehouseClient.notifyNewOrder(
                    order.getOrderNumber(),
                    order.getCustomerId(),
                    order.getWarehouseId(),
                    order.getWarehouseName(),
                    order.getDeliveryPincode(),
                    order.getDeliverySpeed(),
                    pickItems
            );
            log.info("✅ Warehouse manager notified for new order: {}", order.getOrderNumber());
        } catch (Exception e) {
            log.warn("⚠️ Warehouse notification failed for order {} (non-fatal): {}", order.getOrderNumber(), e.getMessage());
        }

        // Step 5.2: Update all order items to CONFIRMED status
        List<OrderItem> items = orderItemRepository.findByOrderNumber(order.getOrderNumber());
        items.forEach(item -> {
            item.setOrderStatus(OrderStatus.CONFIRMED);
            item.setPaymentStatus(PaymentStatus.SUCCESS);
            item.setUpdatedAt(LocalDateTime.now());
        });  orderItemRepository.saveAll(items);

        // Step 5.3: Save status history for audit
        saveStatusHistory(order, OrderStatus.CONFIRMED.name(), "Payment successful & inventory sold");
        StringBuilder warnings = new StringBuilder();
        // Step 5.4: Publish email notification event
        try {
            CustomerDetails customer = customerdetailsService.CustomerDetailsById(order.getCustomerId());
            String customerName = customer != null
                    ? (customer.getFirstName() + " " + customer.getLastName()).trim()
                    : "Customer";
            String customerEmail = resolveCustomerEmail(customer, order.getCustomerId());

            // If still no name (customer not in orders DB), fetch from auth-server
            if (customer == null && customerEmail != null) {
                try {
                    java.util.Map<String, Object> authCustomer = authServiceClient.getCustomerById(order.getCustomerId());
                    if (authCustomer != null) {
                        Object fn = authCustomer.get("firstName");
                        Object ln = authCustomer.get("lastName");
                        if (fn != null) customerName = fn + (ln != null ? " " + ln : "");
                    }
                } catch (Exception ex) { /* non-critical */ }
            }

            emailEventPublisher.publishEmailEvent(OrderEmailEvent.builder()
                    .eventType("ORDER_CONFIRMED")
                    .orderNumber(order.getOrderNumber())
                    .customerId(order.getCustomerId())
                    .customerName(customerName)
                    .customerEmail(customerEmail)
                    .customerPhone(customer != null ? customer.getPhone() : null)
                    .eventTime(LocalDateTime.now())
                    .paymentMode(order.getPaymentMode())
                    .message("CASH_ON_DELIVERY".equalsIgnoreCase(order.getPaymentMode())
                            ? "Your order has been confirmed. Please keep ₹" + order.getTotalAmount() + " ready to pay the delivery partner."
                            : "Your order has been confirmed and is being processed.")
                    .build());
        } catch (Exception e) {
            log.warn("Email publishing failed but continuing with order processing: {}", e.getMessage());
            warnings.append("Email notifications may be delayed. ");
        }

        try {
           //Step 5.5: Publish order created event for downstream services
            //this is used by shipping service to create a shipment record for this order

            orderPubSubService.publishOrderCreatedEvent(order, items);

        } catch (Exception e) {
            log.warn("Order created event publishing failed but continuing: {}", e.getMessage());
            warnings.append("Shipping notifications may be delayed. ");
            // Continue processing - this is for shipping service, not critical for order completion
        }

        // Step 5.6: Publish invoice event for billing service
        try {
            invoiceService.publishInvoiceEvent(order, items);
               log.info("Invoice event published for order: {}", order.getOrderNumber());
               } catch (Exception e) {
            log.warn("Invoice event publishing failed but continuing: {}", e.getMessage());
            warnings.append("Invoice generation may be delayed. ");
            // Continue processing - invoice can be generated later
        }
        return warnings.length() > 0 ? warnings.toString().trim() : null;
    }
    //======================================================================================end finalize method

      /**
     * Step 4.: Confirm inventory sale - convert reservation to actual sale
     */
    private void confirmInventorySale(Order order) {
        try {
            inventoryClient.confirmSale(order.getOrderNumber());
        } catch (FeignException.NotFound e) {
            // If confirm sale fails, release the reservation
            inventoryClient.releaseReservation(buildReleaseRequest(order));
            throw new DownstreamServiceException("Exception raised from confirm sale endpoint", 404);
        } catch (FeignException.ServiceUnavailable e) {
            throw new DownstreamServiceException("Inventory service unavailable", 503);
        } catch (FeignException e) {
            // HTTP 2xx responses can still throw FeignException when Feign
            // fails to decode a void/empty body — treat any 2xx as success.
            if (e.status() >= 200 && e.status() < 300) {
                log.info("confirmSale returned HTTP {} — treating as success (decode-only issue)", e.status());
                return;
            }
            log.error("Feign error: {}", e.getMessage());
            throw new DownstreamServiceException("Inventory service error: " + e.status(), e.status());
        }
    }

    private OrderResponse buildCreateOrderResponse(Order order, List<OrderItem> items) {
        List<OrderItemResponse> itemResponses = customerdetailsService.mapToOrderItemResponsesWithReviews(items, order.getCustomerId());
        return OrderResponse.builder()
                .orderNumber(order.getOrderNumber())
                .customerId(order.getCustomerId())
                .totalAmount(order.getTotalAmount())
                .subtotal(order.getSubtotal())
                .taxAmount(order.getTaxAmount())
                .shippingCharge(order.getShippingCharge())
                .warehouseHandlingCost(order.getWarehouseHandlingCost())
                .packagingCost(order.getPackagingCost())
                .deliveryCost(order.getDeliveryCost())
                .platformFee(order.getPlatformFee())
                .discountAmount(order.getDiscountAmount())
                .couponCode(order.getCouponCode())
                .orderStatus(order.getOrderStatus().name())
                .createdAt(order.getCreatedAt())
                .deliveredAt(order.getDeliveredAt())
                .items(itemResponses)
                .reviewSummary(customerdetailsService.buildReviewSummary(itemResponses))
                .build();
    }

    private OrderResponse buildCreateOrderResponseWithWarning(Order order, List<OrderItem> items, String warningMessage) {
        List<OrderItemResponse> itemResponses = customerdetailsService.mapToOrderItemResponsesWithReviews(items, order.getCustomerId());
        return OrderResponse.builder()
                .orderNumber(order.getOrderNumber())
                .customerId(order.getCustomerId())
                .totalAmount(order.getTotalAmount())
                .subtotal(order.getSubtotal())
                .taxAmount(order.getTaxAmount())
                .shippingCharge(order.getShippingCharge())
                .warehouseHandlingCost(order.getWarehouseHandlingCost())
                .packagingCost(order.getPackagingCost())
                .deliveryCost(order.getDeliveryCost())
                .platformFee(order.getPlatformFee())
                .discountAmount(order.getDiscountAmount())
                .couponCode(order.getCouponCode())
                .orderStatus(order.getOrderStatus().name())
                .createdAt(order.getCreatedAt())
                .deliveredAt(order.getDeliveredAt())
                .warning(warningMessage)
                .items(itemResponses)
                .reviewSummary(customerdetailsService.buildReviewSummary(itemResponses))
                .build();
    }

    /**
     * Fallback warehouse assignment: fetch the first active warehouse from warehouse-service
     * and assign it to the order. Used when barcode lookup fails or returns null.
     */
    private void assignFallbackWarehouse(Order order) {
        try {
            java.util.Map<String, Object> first = warehouseClient.getFirstActiveWarehouse();
            if (first != null) {
                Object wId   = first.get("id");
                Object wName = first.get("name");
                if (wId != null)   order.setWarehouseId(Long.valueOf(wId.toString()));
                if (wName != null) order.setWarehouseName(wName.toString());
                log.info("Fallback warehouse assigned for order {}: {} ({})", order.getOrderNumber(), wName, wId);
            } else {
                log.warn("No active warehouses found for fallback assignment on order {}", order.getOrderNumber());
            }
        } catch (Exception e) {
            log.warn("Fallback warehouse assignment failed for order {}: {}", order.getOrderNumber(), e.getMessage());
        }
    }


}
