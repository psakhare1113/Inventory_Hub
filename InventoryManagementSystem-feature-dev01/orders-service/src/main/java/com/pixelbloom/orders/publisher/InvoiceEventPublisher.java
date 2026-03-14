package com.pixelbloom.orders.publisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.orders.enums.AggregateType;
import com.pixelbloom.orders.event.InvoiceEvent;
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
public class InvoiceEventPublisher {
    private final KafkaTemplate<String, InvoiceEvent> kafkaTemplateInvoice;
    private final OrderOutboxRepository outboxRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void publishInvoiceEvent(InvoiceEvent event) {
        try {
            log.info("Publishing invoice event for order: {}", event.getOrderNumber());
            kafkaTemplateInvoice.send("invoice-events", event.getOrderNumber(), event);
        } catch (Exception ex) {
            log.warn("Direct Kafka publish failed, storing in outbox: {}", ex.getMessage());
            storeInOutbox(event);
            throw new RuntimeException("messaging failed", ex);
        }

    }


    private void storeInOutbox(InvoiceEvent event) {
        try {
            OrderOutbox outbox = OrderOutbox.builder()
                    .aggregateId(event.getOrderNumber())
                    .aggregateType(AggregateType.INVOICE)
                    .eventType("INVOICE_CREATED")
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
