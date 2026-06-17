package com.pixelbloom.orders.event;

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
    private String eventType; // ORDER_CONFIRMED, ORDER_DELIVERED, ORDER_CANCELLED, etc.
    private String orderNumber;
    private Long customerId;
    private String customerEmail;
    private String customerName;
    private String customerPhone; // used for WhatsApp/SMS via Twilio
    private LocalDateTime eventTime;
    private String message;

    // Cancel / Refund specific fields
    private BigDecimal refundAmount;
    private String currency;
    private String paymentMode;       // ONLINE, CASH_ON_DELIVERY
    private String cancellationReason;
    private String refundTimeline;    // e.g. "2-3 business days"
}