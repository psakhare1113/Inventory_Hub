package com.pixelbloom.orders.exception;

public class RefundAlreadyProcessedException extends RuntimeException {
    public RefundAlreadyProcessedException(String message) {
        super(message);
    }
}
