package com.pixelbloom.email_service.service;

import com.pixelbloom.email_service.event.OrderEmailEvent;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailTemplateService {
    private final JavaMailSender javaMailSender;

    @Value("${invoice.email.from:pixelbloomdigital02@gmail.com}")
    private String fromEmail;

    @Value("${invoice.email.to:pixelbloomdigital02@gmail.com}")
    private String toEmail;

    public void sendOrderEmail(OrderEmailEvent event) {
        try {
            String template = getTemplateForEvent(event.getEventType());
            String subject = getSubjectForEvent(event.getEventType());
            String htmlContent = populateTemplate(template, event);

            sendEmail(subject, htmlContent);
            log.info("Email sent for event: {} order: {}", event.getEventType(), event.getOrderNumber());
        } catch (Exception e) {
            log.error("Failed to send email for event: {}", event.getEventType(), e);
        }
    }

    private String getTemplateForEvent(String eventType) {
        return switch (eventType) {
            case "ORDER_CONFIRMED" -> "/templates/OrderConfirmed.html";
            case "ORDER_DELIVERED" -> "/templates/OrderDelivered.html";
            case "PICKUP_INITIATED" -> "/templates/PickupInitiated.html";
            case "RETURN_SUCCESSFUL" -> "/templates/ReturnSuccessful.html";
            case "RETURN_REJECTED" -> "/templates/ReturnRejected.html";
            case "REFUND_SUCCESSFUL" -> "/templates/RefundSuccessful.html";
            default -> "/templates/OrderConfirmed.html";
        };
    }

    private String getSubjectForEvent(String eventType) {
        return switch (eventType) {
            case "ORDER_CONFIRMED" -> "Order Confirmed";
            case "ORDER_DELIVERED" -> "Order Delivered";
            case "PICKUP_INITIATED" -> "Return Pickup Initiated";
            case "RETURN_SUCCESSFUL" -> "Return Successful";
            case "RETURN_REJECTED" -> "Return Rejected";
            case "REFUND_SUCCESSFUL" -> "Refund Processed";
            default -> "Order Update";
        };
    }

    private String populateTemplate(String templatePath, OrderEmailEvent event) throws Exception {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm");

        try (InputStream inputStream = Objects.requireNonNull(
                getClass().getResourceAsStream(templatePath))) {

            String template = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);

            return template
                    .replace("${orderNumber}", event.getOrderNumber())
                    .replace("${customerName}", event.getCustomerName() != null ? event.getCustomerName() : "Customer")
                    .replace("${eventTime}", event.getEventTime().format(formatter))
                    .replace("${additionalInfo}", event.getMessage() != null ? event.getMessage() : "");
        }
    }

    private void sendEmail(String subject, String htmlContent) throws Exception {
        MimeMessage message = javaMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        // Add inline logo
        ClassPathResource logo = new ClassPathResource("static/images/logo.png");
        helper.addInline("logo", logo);


        javaMailSender.send(message);
    }
}
