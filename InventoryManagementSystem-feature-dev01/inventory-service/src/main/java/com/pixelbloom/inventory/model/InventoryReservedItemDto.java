package com.pixelbloom.inventory.model;

import com.pixelbloom.inventory.enums.InventoryStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InventoryReservedItemDto {
    String barcode;
    Long productId;
    Long categoryId;
    Long subcategoryId;
    InventoryStatus inventoryStatus;
    int quantity;
}
