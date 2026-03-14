package com.pixelbloom.orders.publisher;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.orders.enums.AggregateType;
import com.pixelbloom.orders.event.OrderCreatedEvent;
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
public class OrderEventPublisher {

    private final OrderOutboxRepository outboxRepository;
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    private static final String ORDER_CREATED_TOPIC = "order-created-events";
    private final ObjectMapper objectMapper;
    public void publishOrderCreated(OrderCreatedEvent event) {
        try {
          //  String message = objectMapper.writeValueAsString(event); // Convert to JSON
            log.info("Publishing order created event: {}", event.getOrderNumber());
            kafkaTemplate.send(ORDER_CREATED_TOPIC, event.getOrderNumber(), event);
            log.info("Order created event published successfully: {}", event.getOrderNumber());
        } catch (Exception e) {
            log.warn("Direct Kafka publish failed, storing in outbox: {}", e.getMessage());
            storeInOutbox(event);
            throw new RuntimeException("messaging failed", e);
        }
    }

    private void storeInOutbox(OrderCreatedEvent event) {
        try {
            OrderOutbox outbox = OrderOutbox.builder()
                    .aggregateId(event.getOrderNumber())
                    .aggregateType(AggregateType.ORDER)
                    .eventType("ORDER_CREATED")
                    .eventVersion(1)
                    .payload(objectMapper.writeValueAsString(event))
                    .status("NEW")
                    .createdAt(LocalDateTime.now())
                    .build();

            outboxRepository.save(outbox);
            log.info("Order created event stored in outbox for order: {}", event.getOrderNumber());
        } catch (Exception e) {
            log.error("Failed to store order created event in outbox: {}", e.getMessage());
            throw new RuntimeException("Order event publishing failed completely", e);
        }
    }
}

