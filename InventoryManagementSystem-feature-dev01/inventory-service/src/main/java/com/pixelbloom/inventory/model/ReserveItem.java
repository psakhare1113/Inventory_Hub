package com.pixelbloom.inventory.model;

import lombok.Data;

@Data
public class ReserveItem {
    private Long productId;
    private Long categoryId;
    private Long subcategoryId;
    private int quantity;
   // private String barcode;
}
