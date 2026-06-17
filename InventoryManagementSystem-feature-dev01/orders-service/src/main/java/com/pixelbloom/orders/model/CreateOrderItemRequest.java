package com.pixelbloom.orders.model;

import lombok.Data;

@Data
public class CreateOrderItemRequest {
    private Long productId;
    private String productBarcode;
    private Long categoryId;
    private Long subcategoryId;
    private int quantity;

    /**
     * GST rate for this product (%) — sent from frontend after fetching pricing.
     * e.g. 5.0 for clothes, 18.0 for electronics.
     * If null, backend falls back to product's pricing.gstRate or 18%.
     */
    private Double gstRate;
}
