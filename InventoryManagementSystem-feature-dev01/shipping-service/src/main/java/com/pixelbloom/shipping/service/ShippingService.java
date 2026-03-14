package com.pixelbloom.shipping.service;

import com.pixelbloom.shipping.event.OrderCreatedEvent;

public interface ShippingService {
    void createShipment(OrderCreatedEvent event);
    void markDelivered(String orderNumber);

    void getAddress();
}
