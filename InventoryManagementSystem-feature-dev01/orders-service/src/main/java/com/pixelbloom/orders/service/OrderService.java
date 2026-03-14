package com.pixelbloom.orders.service;

import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.requestEntity.CreateOrderRequest;
import com.pixelbloom.orders.responseEntity.OrderResponse;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;


public interface OrderService {
    OrderResponse createOrder(CreateOrderRequest request);

   void markOrderDelivered(String orderNumber, LocalDateTime deliveredAt);








}
