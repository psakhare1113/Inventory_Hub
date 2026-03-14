package com.pixelbloom.orders.requestEntity;


import com.pixelbloom.orders.enums.InventoryStatus;
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
