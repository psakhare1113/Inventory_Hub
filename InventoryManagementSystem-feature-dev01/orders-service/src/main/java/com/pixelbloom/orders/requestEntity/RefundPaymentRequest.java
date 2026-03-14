package com.pixelbloom.orders.requestEntity;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class RefundPaymentRequest {
    String orderNumber;
    private BigDecimal refundAmount;
    private String currency;
    private String refundReason;
}
