package com.pixelbloom.products.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PricingUpdateRequest {
    private Long productId;
    private BigDecimal price;
    private BigDecimal mrp;
    private BigDecimal sellingPrice;
    private Double unitSize;
    private String unitLabel;

}
