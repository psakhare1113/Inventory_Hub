package com.pixelbloom.orders.service;

public interface MessagePublisher {
    void publish(String eventType, String payload);
}
