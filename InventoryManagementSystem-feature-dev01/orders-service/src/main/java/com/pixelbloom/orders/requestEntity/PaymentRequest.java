package com.pixelbloom.orders.requestEntity;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PaymentRequest {

    private String orderNumber;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;
}
