package com.pixelbloom.orders.enums;


import com.pixelbloom.orders.exception.InvalidEnumValueException;

public enum InventoryStatus {
    AVAILABLE,
    RESERVED,
    SALE,
    DAMAGED,
    SCRAPPED,
    REMOVED,
    RETURN_UNDER_INSPECTION;

    public static InventoryStatus from(String value) {
        try {
            return InventoryStatus.valueOf(value.toUpperCase());
        } catch (Exception ex) {
            throw new InvalidEnumValueException("inventoryStatus", value);
        }
    }
}
