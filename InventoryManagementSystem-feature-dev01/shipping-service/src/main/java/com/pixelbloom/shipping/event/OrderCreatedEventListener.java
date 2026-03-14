package com.pixelbloom.shipping.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.shipping.service.ShippingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderCreatedEventListener {
    private final ShippingService shippingService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "order-created-events", groupId = "shipping-service-group")
    public void handleOrderCreated(String message) {
        try {
            OrderCreatedEvent event = objectMapper.readValue(message, OrderCreatedEvent.class);
            log.info("Received order created event: {}", event.getOrderNumber());
            shippingService.createShipment(event);
        } catch (Exception e) {
            log.error("Failed to process order created event", e);
        }
    }

}
