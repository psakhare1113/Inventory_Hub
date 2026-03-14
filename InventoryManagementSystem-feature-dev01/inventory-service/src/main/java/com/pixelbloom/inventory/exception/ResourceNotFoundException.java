package com.pixelbloom.inventory.exception;

public class ResourceNotFoundException  extends RuntimeException{

    private final String errorCode;

    public ResourceNotFoundException(String message) {
        super(message);
        this.errorCode = "INTERNAL_SERVER_ERROR";
    }

    public String getErrorCode() {
        return errorCode;
    }
}
