package com.pixelbloom.orders.publisher;

import com.pixelbloom.orders.model.OrderOutbox;
import com.pixelbloom.orders.repository.OrderOutboxRepository;
import com.pixelbloom.orders.service.OutboxService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaOutboxPublisher {

    private final OrderOutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    private final OutboxService outboxService;

    @Scheduled(fixedDelay = 5000)
    public void publishEvents() {
        outboxService.publishEvents();
    }
}
