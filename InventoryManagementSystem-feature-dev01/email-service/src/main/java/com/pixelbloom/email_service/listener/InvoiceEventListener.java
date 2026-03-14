package com.pixelbloom.email_service.listener;
// Path: email-service/src/main/java/com/pixelbloom/email_service/listener/InvoiceEventListener.java


import com.fasterxml.jackson.databind.ObjectMapper;

import com.pixelbloom.email_service.model.InvoiceEvent;
import com.pixelbloom.email_service.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InvoiceEventListener {
    private final InvoiceService invoiceService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "invoice-events", groupId = "email-service-group")
    public void handleInvoiceEvent(String message) {
        try {
            InvoiceEvent event = objectMapper.readValue(message, InvoiceEvent.class);
            log.info("Processing invoice event for order>>>>>>>>>>>>: {}", event);
            log.info("Received invoice event for order: {}", event.getOrderNumber());
            invoiceService.generateAndSendInvoice(event);
        } catch (Exception e) {
            log.error("Failed to process invoice event", e);
        }
    }
}
