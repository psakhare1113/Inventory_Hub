package com.pixelbloom.payment.requestDto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class RefundRequest {
    private String orderNumber;
    private String refundReason;
    private String paymentSource;
    private BigDecimal refundAmount;
    private String currency;

}
