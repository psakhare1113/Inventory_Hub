package com.pixelbloom.inventory.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor @NoArgsConstructor
public class InventoryConfirmSaleRequest {

    private Long orderId;
    private Long productId;
    private Long categoryId;
    private Long subcategoryId;
    private int quantity;
    private List<InventoryConfirmSaleItem> items;
}
