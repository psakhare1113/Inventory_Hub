package com.pixelbloom.inventory.enums;

import com.pixelbloom.inventory.exception.InvalidEnumValueException;

public enum ConditionStatus {
    GOOD,
    WAREHOUSE_DAMAGED,
    CUSTOMER_DAMAGED,
    EXPIRED;

    public static ConditionStatus from(String value) {
        try {
            return ConditionStatus.valueOf(value.toUpperCase());
        } catch (Exception ex) {
            throw new InvalidEnumValueException("inventoryStatus", value);
        }
    }
}
