package com.pixelbloom.email_service.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderEmailEvent {
    private String eventType; // ORDER_CONFIRMED, ORDER_DELIVERED, REFUND_SUCCESSFUL, RETURN_SUCCESSFUL, etc.
    private String orderNumber;
    private Long customerId;
    private String customerEmail;
    private String customerName;
    private String customerPhone; // used for WhatsApp/SMS via Twilio
    private LocalDateTime eventTime;
    private String message;

    // Refund specific fields
    private BigDecimal refundAmount;
    private String currency;
    private String paymentSource; // UPI, CARD, NET_BANKING, WALLET
    private String refundTimeline; // e.g. "2-3 business days"

    // Cancel specific fields
    private String cancellationReason;
    private String paymentMode; // ONLINE, CASH_ON_DELIVERY
}