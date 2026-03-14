package com.pixelbloom.inventory.model;

import lombok.Data;

@Data
public class ReleaseItem {

    private Long productId;
    private Long categoryId;
    private Long subcategoryId;
    private int quantity;
}
