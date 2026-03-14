package com.pixelbloom.inventory.exception;

public class InsufficientInventoryException extends RuntimeException {


    private final String errorCode;

    public InsufficientInventoryException(String message) {
        super(message);
        this.errorCode = "INSUFFICIENT_INVENTORY";
    }

    public String getErrorCode() {
        return errorCode;
    }
}
