package com.pixelbloom.payment.responseDto;

import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class PaymentResponse {
    private boolean success;
    private String transactionId;
    private LocalDateTime createdAt;
}
