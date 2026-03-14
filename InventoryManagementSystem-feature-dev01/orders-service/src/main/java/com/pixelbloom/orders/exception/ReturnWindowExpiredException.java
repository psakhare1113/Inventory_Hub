package com.pixelbloom.orders.exception;
public class ReturnWindowExpiredException extends RuntimeException {
    public ReturnWindowExpiredException(String message) {
        super(message);
    }
}