package com.pixelbloom.inventory.enums;

import com.pixelbloom.inventory.exception.InvalidEnumValueException;

public enum InventoryStatus {
    AVAILABLE,
    RESERVED,
    SALE,
    DAMAGED,
    SCRAPPED,
    REMOVED,
    RETURN_UNDER_INSPECTION, RETURN_APPROVED, INSPECTION_REQUESTED,RETURN_REJECTED, RETURN_REQUESTED,
    REFUND_REQUESTED, INSPECTION_APPROVED, INSPECTION_REJECTED,
    RETURN_INITIATED;


    public static InventoryStatus from(String value) {
        try {
            return InventoryStatus.valueOf(value.toUpperCase());
        } catch (Exception ex) {
            throw new InvalidEnumValueException("inventoryStatus", value);
        }
    }
}
