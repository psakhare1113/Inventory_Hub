package com.pixelbloom.orders.exception;

import org.springframework.http.HttpStatus;

public class DownstreamServiceException extends RuntimeException {

    private final int status;

    public DownstreamServiceException(String message, int status) {
        super(message);
        this.status = status;
    }

    // 👇 ADD THIS
    public DownstreamServiceException(String message) {
        super(message);
        this.status = HttpStatus.INTERNAL_SERVER_ERROR.value();
    }

    public int getStatus() {
        return status;
    }

}
