package com.pixelbloom.orders.service;

import com.pixelbloom.orders.event.OrderCreatedEvent;
import com.pixelbloom.orders.model.Order;
import com.pixelbloom.orders.model.OrderItem;

import java.util.List;

public interface OrderPubSubService {
    OrderCreatedEvent  publishOrderCreatedEvent(Order order, List<OrderItem> items);
}
