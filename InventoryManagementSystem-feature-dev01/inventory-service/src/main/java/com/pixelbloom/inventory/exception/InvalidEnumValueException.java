package com.pixelbloom.inventory.exception;

public class InvalidEnumValueException extends RuntimeException {
    public InvalidEnumValueException(String field, String value) {
        super("Invalid value '" + value + "' for " + field);

    }
}
