package com.pixelbloom.orders.exception;

public class InvalidRefundStatusException extends RuntimeException {
    public InvalidRefundStatusException(String message) {
        super(message);
    }
}
