package com.pixelbloom.products.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PricingUpdateRequest {
    private Long productId;
    private BigDecimal price;
    private BigDecimal mrp;
    private BigDecimal sellingPrice;
    private BigDecimal costPrice;       // supplier purchase price → inventory buyPrice
    private BigDecimal packagingCost;   // packaging cost per unit
    private BigDecimal shippingCost;    // shipping/logistics cost per unit
    private BigDecimal profitMargin;    // profit per unit (₹)
    private BigDecimal discount;
    private BigDecimal gstRate;
    private Double unitSize;
    private String unitLabel;

}
