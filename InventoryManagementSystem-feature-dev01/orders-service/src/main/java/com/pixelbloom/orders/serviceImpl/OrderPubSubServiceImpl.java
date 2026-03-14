package com.pixelbloom.orders.serviceImpl;

import com.pixelbloom.orders.event.OrderCreatedEvent;
import com.pixelbloom.orders.model.Order;
import com.pixelbloom.orders.model.OrderItem;
import com.pixelbloom.orders.publisher.OrderEventPublisher;
import com.pixelbloom.orders.service.OrderPubSubService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
@Slf4j
public class OrderPubSubServiceImpl implements OrderPubSubService {

    private final OrderEventPublisher orderEventPublisher;

    /**
     * Step 4.5: Publish order created event for downstream services
     */
    public OrderCreatedEvent publishOrderCreatedEvent(Order order, List<OrderItem> items) {
        OrderCreatedEvent event = OrderCreatedEvent.builder()
                .eventType("ORDER_CREATED")
                .orderId(order.getId()).orderNumber(order.getOrderNumber())
                .customerId(order.getCustomerId()).totalAmount(order.getTotalAmount())
                .currency(order.getCurrency()).paymentMode(order.getPaymentMode())
                .createdAt(order.getCreatedAt()).items(items.stream()
                        .map(item -> OrderCreatedEvent.OrderItemDetail.builder()
                                .productId(item.getProductId()).barcode(item.getBarcode())
                                .quantity(item.getQuantity()).price(item.getTotalPrice())
                                .build())
                        .toList())
                .build();
        System.out.println("print publishOrderCreatedEvent=================>"+event);
        orderEventPublisher.publishOrderCreated(event);
        return event;
    }
}
