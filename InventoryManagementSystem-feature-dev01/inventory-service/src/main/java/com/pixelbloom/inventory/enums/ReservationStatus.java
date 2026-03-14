package com.pixelbloom.inventory.enums;

import com.pixelbloom.inventory.exception.InvalidEnumValueException;

public enum ReservationStatus {
    RESERVED,
    CONFIRMED,
    RELEASED, REFUND_REQUESTED, RETURN_REQUESTED, RETURN_INITIATED;

  /*  public static ReservationStatus from(String value) {
        try {
            return ReservationStatus.valueOf(value.toUpperCase());
        } catch (Exception ex) {
            throw new InvalidEnumValueException("ReservationStatus", value);
        }
    }*/
}