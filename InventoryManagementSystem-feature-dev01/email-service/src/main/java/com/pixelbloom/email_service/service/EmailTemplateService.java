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

            sendEmail(subject, htmlContent, event.getCustomerEmail());
            log.info("Email sent to {} for event: {} order: {}", event.getCustomerEmail(), event.getEventType(), event.getOrderNumber());
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
            case "OUT_OF_STOCK" -> "/templates/OutOfStock.html";
            case "ORDER_CANCELLED" -> "/templates/OrderCancelled.html";
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
            case "OUT_OF_STOCK" -> "Product Out of Stock - Order Not Placed";
            case "ORDER_CANCELLED" -> "Order Cancelled — Refund Initiated";
            default -> "Order Update";
        };
    }

    private String populateTemplate(String templatePath, OrderEmailEvent event) throws Exception {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm");

        try (InputStream inputStream = Objects.requireNonNull(
                getClass().getResourceAsStream(templatePath))) {

            String template = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);

            // Refund timeline based on payment source
            String refundTimeline = event.getRefundTimeline() != null ? event.getRefundTimeline()
                    : getRefundTimeline(event.getPaymentSource());

            String refundAmount = event.getRefundAmount() != null
                    ? "₹" + event.getRefundAmount()
                    : "Full Amount";

            String currency = event.getCurrency() != null ? event.getCurrency() : "INR";
            String paymentSource = event.getPaymentSource() != null ? event.getPaymentSource() : "Original Payment Method";

            // ── COD-aware payment mode label & notice block ──────────────────
            boolean isCod = "CASH_ON_DELIVERY".equalsIgnoreCase(event.getPaymentMode());

            String paymentModeLabel = isCod
                    ? "<span style=\"display:inline-block;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:700;background-color:#fef3c7;color:#92400e;\">💵 Cash on Delivery</span>"
                    : "<span style=\"display:inline-block;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:700;background-color:#dcfce7;color:#166534;\">💳 Online Payment</span>";

            String paymentNoticeBlock = isCod
                    ? "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:20px 0;\">" +
                      "<tr><td style=\"background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;\">" +
                      "<p style=\"margin:0 0 6px;font-size:15px;font-weight:700;color:#92400e;\">💵 Cash on Delivery Order</p>" +
                      "<p style=\"margin:0;font-size:13px;color:#78350f;line-height:1.6;\">" + (event.getMessage() != null ? event.getMessage() : "") + "</p>" +
                      "<p style=\"margin:10px 0 0;font-size:12px;color:#a16207;\">ℹ️ Please keep the exact cash amount ready when the delivery partner arrives. No online payment is required.</p>" +
                      "</td></tr></table>"
                    : "<p style=\"color:#555;font-size:13px;\">" + (event.getMessage() != null ? event.getMessage() : "") + "</p>";

            return template
                    .replace("${orderNumber}", event.getOrderNumber())
                    .replace("${customerName}", event.getCustomerName() != null ? event.getCustomerName() : "Customer")
                    .replace("${eventTime}", event.getEventTime().format(formatter))
                    .replace("${additionalInfo}", event.getMessage() != null ? event.getMessage() : "")
                    .replace("${paymentModeLabel}", paymentModeLabel)
                    .replace("${paymentNoticeBlock}", paymentNoticeBlock)
                    .replace("${refundAmount}", refundAmount)
                    .replace("${currency}", currency)
                    .replace("${paymentSource}", paymentSource)
                    .replace("${refundTimeline}", refundTimeline)
                    .replace("${cancellationReason}", event.getCancellationReason() != null ? event.getCancellationReason() : "")
                    .replace("${paymentMode}", event.getPaymentMode() != null ? event.getPaymentMode() : "");
        }
    }

    private String getRefundTimeline(String paymentSource) {
        if (paymentSource == null) return "5-7 business days";
        return switch (paymentSource.toUpperCase()) {
            case "UPI" -> "2-3 business days";
            case "NET_BANKING" -> "3-5 business days";
            case "WALLET" -> "Instant (within minutes)";
            default -> "5-7 business days"; // CARD, CREDIT_CARD, DEBIT_CARD
        };
    }

    private void sendEmail(String subject, String htmlContent, String recipientEmail) throws Exception {
        MimeMessage message = javaMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(recipientEmail != null && !recipientEmail.isBlank()
                && !recipientEmail.endsWith("@example.com") ? recipientEmail : toEmail);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);

        // Add inline logo
        ClassPathResource logo = new ClassPathResource("static/images/logo.png");
        helper.addInline("logo", logo);

        javaMailSender.send(message);
    }
}
