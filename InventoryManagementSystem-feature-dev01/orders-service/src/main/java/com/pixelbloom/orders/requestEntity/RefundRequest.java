package com.pixelbloom.orders.requestEntity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequest {
    private String orderNumber;  // get from UI
    private String barcode;  // get from UI
    private String refundReason;
    private String currency;
}



