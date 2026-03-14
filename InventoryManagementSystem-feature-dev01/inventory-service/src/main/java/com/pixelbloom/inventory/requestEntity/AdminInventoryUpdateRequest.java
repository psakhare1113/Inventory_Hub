package com.pixelbloom.inventory.requestEntity;

import lombok.Data;

@Data
public class AdminInventoryUpdateRequest {


    private String inventoryStatus;
    private String platformStatus;
    private String conditionStatus;
    private Boolean isCustomerReturned;
    private Boolean isWarehouseDamaged;
    private Long updatedBy;
}
