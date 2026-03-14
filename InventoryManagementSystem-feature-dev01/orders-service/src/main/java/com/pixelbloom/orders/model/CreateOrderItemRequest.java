package com.pixelbloom.orders.model;

import lombok.Data;

@Data
public class CreateOrderItemRequest {
    private Long productId;
    private String productBarcode;
    private Long categoryId;
    private Long subcategoryId;
    private int quantity;

}
