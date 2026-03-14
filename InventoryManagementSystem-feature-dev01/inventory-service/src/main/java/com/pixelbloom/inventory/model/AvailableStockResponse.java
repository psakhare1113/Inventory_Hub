package com.pixelbloom.inventory.model;

import com.pixelbloom.inventory.enums.ConditionStatus;
import com.pixelbloom.inventory.enums.InventoryStatus;
import com.pixelbloom.inventory.enums.PlatformStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AvailableStockResponse {

    private Long inventoryId;
    private String barcode;

    private Long productId;
    private Long categoryId;
    private Long subcategoryId;

    private InventoryStatus inventoryStatus;
    private PlatformStatus platformStatus;
    private ConditionStatus conditionStatus;
}