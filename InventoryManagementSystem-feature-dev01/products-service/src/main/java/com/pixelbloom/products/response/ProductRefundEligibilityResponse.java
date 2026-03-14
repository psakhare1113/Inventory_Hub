package com.pixelbloom.products.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductRefundEligibilityResponse {
    private boolean refundEligible;
    private String reason;
}
