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
     * Step 2: Reserve inventory for order items
     * Calls external inventory service to reserve stock
     */
    public void reserveInventory(String orderNumber, List<OrderItem> orderItems) {
        try {
            inventoryClient.reserveInventory(buildReserveRequest(orderNumber, orderItems));
        } catch (FeignException.BadRequest e) {
            log.error("Insufficient inventory: {}", e.getMessage());
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
     * Check if exception is related to messaging/Kafka failures
     */
    private boolean isMessagingFailure(Exception e) {
        return e.getMessage() != null &&
                (e.getMessage().contains("kafka") || e.getMessage().contains("messaging"));
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

        // Step 1.2: Create order items and calculate total amount
        BigDecimal totalAmount = saveItems(order.getId(), orderNumber, request);

        // Step 1.3: Update order with calculated total amount
        order.setTotalAmount(totalAmount);
        order.setUpdatedAt(LocalDateTime.now());

        return orderRepository.save(order);
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

        return InventoryReserveRequest.builder()
                .orderNumber(orderNumber)
                .items(itemCounts.entrySet().stream()
                        .map(entry -> {
                            OrderItem item = itemDetails.get(entry.getKey());
                            return InventoryItemRequest.builder()
                                    .productId(item.getProductId())
                                    .categoryId(item.getCategoryId())
                                    .subcategoryId(item.getSubcategoryId())
                                    .quantity(entry.getValue())
                                    .build();
                        })
                        .toList())
                .build();
    }

    /**
     * Save order status change history for audit trail
     */
    @Transactional
    protected void saveStatusHistory(Order order, String newStatus, String remarks) {
        String previousStatus = statusHistoryRepository
                .findTopByOrderIdOrderByChangedAtDesc(order.getId())
                .map(OrderStatusHistory::getStatus)
                .orElse(null);

        OrderStatusHistory history = OrderStatusHistory.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(newStatus)
                .previousStatus(previousStatus)
                .changedBy("SYSTEM")
                .remarks(remarks)
                .createdAt(LocalDateTime.now())
                .changedAt(LocalDateTime.now())
                .build();

        statusHistoryRepository.save(history);
    }

    /**
     * Create outbox event for eventual consistency pattern
     */
    @Transactional
    protected void createOrderCreatedOutbox(Order order) {
        try {
            OrderOutbox outbox = OrderOutbox.builder()
                    .aggregateId(order.getOrderNumber())
                    .aggregateType(AggregateType.ORDER)
                    .eventType("ORDER_CONFIRMED")
                    .eventVersion(1)
                    .payload(objectMapper.writeValueAsString(order))
                    .status("NEW")
                    .createdAt(LocalDateTime.now())
                    .build();

            outboxRepository.save(outbox);
        } catch (JsonProcessingException e) {
            throw new BusinessException("Failed to serialize order for outbox");
        }
    }

    /**
     * Step 1.2: Create order items and calculate total amount
     * Fetches pricing for each product and creates individual item records
     */
    private BigDecimal saveItems(Long orderId, String orderNumber, CreateOrderRequest request) {
        BigDecimal totalAmount = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        for (CreateOrderItemRequest i : request.getItems()) {
            // Fetch current pricing for the product
            Pricing pricing = pricingService.getLatestPriceByProductId(i.getProductId())
                    .orElseThrow(() -> new PricingException("Price not found for product " + i.getProductId()));

            // Create one record per unit (quantity expansion)
            for (int q = 0; q < i.getQuantity(); q++) {
                OrderItem item = OrderItem.builder()
                        .orderId(orderId)
                        .orderNumber(orderNumber)
                        .productId(i.getProductId())
                        .categoryId(i.getCategoryId())
                        .subcategoryId(i.getSubcategoryId())
                        .barcode(i.getProductBarcode())
                        .quantity(1) // Each record represents 1 unit
                        .unitPrice(pricing.getUnitPrice())
                        .totalPrice(pricing.getUnitPrice())
                        .orderStatus(OrderStatus.CONFIRMED)
                        .paymentStatus(PaymentStatus.SUCCESS)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();

                orderItems.add(item);
                totalAmount = totalAmount.add(pricing.getUnitPrice());
            }
        }

        orderItemRepository.saveAll(orderItems);
        return totalAmount;
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
        emailEventPublisher.publishEmailEvent(
                OrderEmailEvent.builder()
                        .eventType("ORDER_DELIVERED")
                        .orderNumber(orderNumber)
                        .customerId(order.getCustomerId())
                        .eventTime(deliveredAt)
                        .build()
        );

        saveStatusHistory(order, OrderStatus.DELIVERED.name(), "Order delivered successfully");
        log.info("Order {} and {} items marked as DELIVERED", orderNumber, orderItems.size());
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
        order.setOrderStatus(OrderStatus.CONFIRMED);
        order.setPaymentStatus(PaymentStatus.SUCCESS);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepository.save(order);

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
            emailEventPublisher.publishEmailEvent(OrderEmailEvent.builder()
                    .eventType("ORDER_CONFIRMED").orderNumber(order.getOrderNumber()).customerId(order.getCustomerId())
                    .eventTime(LocalDateTime.now()).build());
        } catch (Exception e) {
            log.warn("Email publishing failed but continuing with order processing: {}", e.getMessage());
            warnings.append("Email notifications may be delayed. ");
            // Continue processing - email is stored in outbox for retry
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
            log.error("Feign error: {}", e.getMessage());
            throw new DownstreamServiceException("Inventory service error: " + e.status(), e.status());
        }
    }

    private OrderResponse buildCreateOrderResponse(Order order, List<OrderItem> items) {
        List<OrderItemResponse> itemResponses = customerdetailsService.mapToOrderItemResponsesWithReviews(items, order.getCustomerId());

        return OrderResponse.builder().orderNumber(order.getOrderNumber()).totalAmount(order.getTotalAmount())
                .orderStatus(order.getOrderStatus().name()).createdAt(order.getCreatedAt()).deliveredAt(order.getDeliveredAt())
                .items(itemResponses).reviewSummary(customerdetailsService.buildReviewSummary(itemResponses)).build();
    }

    private OrderResponse buildCreateOrderResponseWithWarning(Order order, List<OrderItem> items, String warningMessage) {
        List<OrderItemResponse> itemResponses = customerdetailsService.mapToOrderItemResponsesWithReviews(items, order.getCustomerId());
        return OrderResponse.builder().orderNumber(order.getOrderNumber()).totalAmount(order.getTotalAmount()).orderStatus(order.getOrderStatus().name())
                .createdAt(order.getCreatedAt()).deliveredAt(order.getDeliveredAt())
                .warning(warningMessage).items(itemResponses).reviewSummary(customerdetailsService.buildReviewSummary(itemResponses)).build();
    }


}
