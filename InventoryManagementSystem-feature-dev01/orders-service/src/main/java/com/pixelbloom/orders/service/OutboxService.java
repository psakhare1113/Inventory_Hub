package com.pixelbloom.orders.service;

import com.pixelbloom.orders.model.OrderOutbox;
import com.pixelbloom.orders.repository.OrderOutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxService {

    private final OrderOutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private String topic;


    @Transactional
    public void publishEvents() {

        List<OrderOutbox> events = outboxRepository
                .findTop50ByStatusInOrderByCreatedAtAsc(List.of("NEW", "FAILED"), PageRequest.of(0, 50));

        for (OrderOutbox event : events) {
           if ("ORDER_CONFIRMED".equals(event.getEventType())) {
                topic = "order-email-events";
            } else if ("ORDER_CREATED".equals(event.getEventType())) {
                topic = "order-created-events";
            } else if ("INVOICE_CREATED".equals(event.getEventType())) {
                topic = "invoice-events";
            } else {
                topic = "domain-events";
            }

            try {
                log.info(" Publishing to Kafka | key={} | payload={} | topic={}",event.getAggregateType() + "-" + event.getAggregateId(), event.getPayload(),topic);

                kafkaTemplate.send(topic,event.getAggregateType() + "-" + event.getAggregateId(),event.getPayload()).get();
                event.setStatus("SENT");
                log.info("Successfully published outbox event: {}", event.getId());
            } catch (Exception ex) {
                log.error(" Kafka publish failed for outboxId={}", event.getId(), ex);
                // Increment retry count to prevent infinite loops
                int retryCount = event.getRetryCount() != null ? event.getRetryCount() : 0;
                if (retryCount >= 5) { // Max 5 retries
                    event.setStatus("FAILED");
                    log.warn(" Event {} moved to FAILED after {} retries", event.getId(), retryCount);
                } else {
                    event.setStatus("FAILED");
                    event.setRetryCount(retryCount + 1);
                }
            }
        }
        outboxRepository.saveAll(events);
    }

    //create an endpoint for admin to fetch all eventType= FAILED so that admin can resend it

    public List<OrderOutbox> getFailedEvents() {
        // First, check all records to see what statuses exist
        List<OrderOutbox> allEvents = outboxRepository.findAll();
        log.info("Total outbox records: {}", allEvents.size());

        allEvents.forEach(event ->
                log.info("Event ID: {}, Status: '{}', EventType: {}",
                        event.getId(), event.getStatus(), event.getEventType())
        );

        // Then try to find FAILED ones
        List<OrderOutbox> failedEvents = outboxRepository.findByStatusIn(List.of("FAILED"));
        log.info("Found {} FAILED events", failedEvents.size());

        return failedEvents;
    }


    public void resendFailedEvents() {
        outboxRepository.findByStatusIn(List.of("FAILED")).forEach(event -> {
            // Retry publishing logic here
            log.info("Retrying failed event: {}", event.getId());
            try {
                publishEvents();
                log.info("Successfully published event:  {}", event.getId());
            }catch (Exception e){
                log.error("Failed to resend failed event: {}", event.getId());
            }  });
    }
}
