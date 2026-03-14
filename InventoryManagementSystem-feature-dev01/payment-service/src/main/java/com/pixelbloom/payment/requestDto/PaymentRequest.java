package com.pixelbloom.payment.requestDto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {

    private String orderNumber;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
}
