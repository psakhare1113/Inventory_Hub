package com.pixelbloom.orders.publisher;

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class DebugKafkaConsumer {

    @KafkaListener(
            topics = "${kafka.topic.domain-events}",
            groupId = "order-debug-consumer"
    )
    public void consume(String message) {
        log.info("📥 Kafka message received: {}", message);
    }
}
