package com.pixelbloom.inventory.enums;

import com.pixelbloom.inventory.exception.InvalidEnumValueException;

public enum PlatformStatus {
    ENABLED,
    DISABLED;

    public static PlatformStatus from(String value) {
        try {
            return PlatformStatus.valueOf(value.toUpperCase());
        } catch (Exception ex) {
            throw new InvalidEnumValueException("inventoryStatus", value);
        }
    }
}
