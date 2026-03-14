package com.pixelbloom.orders.responseEntity;

import lombok.Data;

import java.time.LocalDateTime;
@Data
public class InventoryReserveResponse {

    private boolean reserved;
    private LocalDateTime expiresAt;
}
