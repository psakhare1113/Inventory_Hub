package com.pixelbloom.inventory.model;

import com.pixelbloom.inventory.enums.InventoryStatus;
import lombok.Data;

import java.time.LocalDateTime;
@Data
public class InventoryReserveResponse {

    private String orderId;
    private boolean reserved;
    private InventoryStatus inventoryStatus;
    private LocalDateTime expiresAt;
}
