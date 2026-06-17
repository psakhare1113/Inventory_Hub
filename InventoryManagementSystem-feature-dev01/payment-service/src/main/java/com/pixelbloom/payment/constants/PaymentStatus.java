package com.pixelbloom.payment.constants;

public enum PaymentStatus {
    PENDING,       // COD — cash to be collected at delivery
    COLLECTED,     // COD — cash collected by delivery boy at doorstep
    SUCCESS,
    REFUNDED, REFUND_FAILED, FAILED
}
