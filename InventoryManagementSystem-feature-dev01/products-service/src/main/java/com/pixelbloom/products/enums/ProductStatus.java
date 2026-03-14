package com.pixelbloom.products.enums;

import com.pixelbloom.products.exception.InvalidEnumValueException;

public enum ProductStatus {
    ACTIVE,
    INACTIVE;

    public static ProductStatus from(String value) {
        try {
            return ProductStatus.valueOf(value.toUpperCase());
        } catch (Exception ex) {
            throw new InvalidEnumValueException("inventoryStatus", value);
        }
    }
}
