package com.pixelbloom.inventory.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SellItem {
    private Long productId;
    private Long categoryId;
    private Long subcategoryId;
    private int requestedQuantity;
}