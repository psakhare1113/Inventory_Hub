package com.pixelbloom.orders.enums;

/**
 * Real-time availability status of a delivery boy.
 */
public enum DeliveryBoyStatusEnum {

    /** Delivery boy is not logged in / not working today */
    OFFLINE,

    /** Logged in and ready to accept orders */
    AVAILABLE,

    /** Currently at maximum order capacity */
    BUSY,

    /** Temporarily unavailable (lunch break, etc.) */
    ON_BREAK
}
