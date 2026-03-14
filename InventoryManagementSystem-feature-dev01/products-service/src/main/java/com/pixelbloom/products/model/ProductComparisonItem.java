package com.pixelbloom.products.model;

import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class ProductComparisonItem {
    private Long productId;
    private String name;
    private BigDecimal basePrice;
    private Map<String, String> attributes;
}
