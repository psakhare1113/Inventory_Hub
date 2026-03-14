package com.pixelbloom.orders.publisher;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.orders.enums.AggregateType;
import com.pixelbloom.orders.event.OrderEmailEvent;
import com.pixelbloom.orders.model.OrderOutbox;
import com.pixelbloom.orders.repository.OrderOutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailEventPublisher {
    private final KafkaTemplate<String, OrderEmailEvent> kafkaTemplate;
    private final OrderOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;


    public void publishEmailEvent(OrderEmailEvent event) {
        try {
            // Try direct Kafka publish first
            kafkaTemplate.send("order-email-events", event.getOrderNumber(), event).get();
            log.info("Email event published successfully: {} for order: {}", event.getEventType(), event.getOrderNumber());
        } catch (Exception e) {
            log.warn("Direct Kafka publish failed, storing in outbox: {}", e.getMessage());
            storeInOutbox(event);
            throw new RuntimeException("messaging failed", e); // Custom message
        }
    }


    private void storeInOutbox(OrderEmailEvent event) {
        try {
            OrderOutbox outbox = OrderOutbox.builder()
                    .aggregateId(event.getOrderNumber())
                    .aggregateType(AggregateType.ORDER)
                    .eventType("ORDER_CONFIRMED")
                    .eventVersion(1)
                    .payload(objectMapper.writeValueAsString(event))
                    .status("NEW")
                    .createdAt(LocalDateTime.now())
                    .build();

            outboxRepository.save(outbox);
            log.info("Email event stored in outbox for order: {}", event.getOrderNumber());
        } catch (Exception e) {
            log.error("Failed to store email event in outbox: {}", e.getMessage());
            throw new RuntimeException("Email event publishing failed completely", e);
        }
    }

}