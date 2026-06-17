package com.pixelbloom.payment.responseDto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PaymentResponse {
    // Existing fields
    private boolean success;
    private String transactionId;
    private String failureReason;
    private LocalDateTime createdAt;

    // Razorpay fields
    private String orderId;
    private String paymentId;
    private Double amount;
    private String currency;
    private String status;
    private String message;
}
