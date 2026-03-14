package com.pixelbloom.orders.responseEntity;

import lombok.Data;

@Data
public class ProductRefundEligibilityResponse {
    private boolean refundEligible;
    private String reason;
}
