
package com.pixelbloom.orders.listener;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.orders.event.ShipmentDeliveredEvent;
import com.pixelbloom.orders.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShipmentDeliveredEventListener {
    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "shipment-delivered-events", groupId = "order-service-group")
    public void handleShipmentDelivered(String message) {
        try {
            ShipmentDeliveredEvent event = objectMapper.readValue(message, ShipmentDeliveredEvent.class);
            log.info("Received shipment delivered event for order: {}", event.getOrderNumber());
            orderService.markOrderDelivered(event.getOrderNumber(), event.getDeliveredAt());
        } catch (Exception e) {
            log.error("Failed to process shipment delivered event", e);
        }
    }
}
