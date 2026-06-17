package com.pixelbloom.orders.service;

import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.requestEntity.CreateOrderRequest;
import com.pixelbloom.orders.responseEntity.OrderResponse;

import java.time.LocalDateTime;

public interface OrderService {
    OrderResponse createOrder(CreateOrderRequest request);
    void markOrderDelivered(String orderNumber, LocalDateTime deliveredAt);
    void updateOrderStatus(String orderNumber, OrderStatus newStatus);
}
