package com.pixelbloom.orders.requestEntity;

import com.pixelbloom.orders.enums.InventoryStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryReservedItemDto {
    String barcode;
    Long productId;
    Long categoryId;
    Long subcategoryId;
    InventoryStatus inventoryStatus;
    int quantity;
}
