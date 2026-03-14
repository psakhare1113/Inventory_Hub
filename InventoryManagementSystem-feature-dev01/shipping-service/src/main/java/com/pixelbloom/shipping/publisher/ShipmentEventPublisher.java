package com.pixelbloom.shipping.publisher;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.shipping.event.ShipmentDeliveredEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShipmentEventPublisher {
    private final KafkaTemplate<String, ShipmentDeliveredEvent> kafkaTemplate;

    public void publishShipmentDelivered(ShipmentDeliveredEvent event) {
        log.info("Publishing shipment delivered event: {}", event.getOrderNumber());
        kafkaTemplate.send("shipment-delivered-events", event.getOrderNumber(), event);
    }

}