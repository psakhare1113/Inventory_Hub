package com.pixelbloom.email_service.listener;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.pixelbloom.email_service.event.OrderEmailEvent;
import com.pixelbloom.email_service.service.EmailTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEmailEventListener {
    private final EmailTemplateService emailTemplateService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "order-email-events", groupId = "email-service-group")
    public void handleOrderEmailEvent(String message) {
        try {
            OrderEmailEvent event = objectMapper.readValue(message, OrderEmailEvent.class);
            log.info("Received email event: {} for order: {}", event.getEventType(), event.getOrderNumber());
            emailTemplateService.sendOrderEmail(event);
        } catch (Exception e) {
            log.error("Failed to process email event", e);
        }
    }
}