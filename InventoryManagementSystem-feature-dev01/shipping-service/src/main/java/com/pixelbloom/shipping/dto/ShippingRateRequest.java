package com.pixelbloom.shipping.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for calculating shipping charges.
 * Sent from checkout page before order is placed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingRateRequest {

    /** Delivery pincode entered by customer */
    private String deliveryPincode;

    /** Warehouse/pickup pincode (default: Mumbai 400001) */
    private String pickupPincode;

    /** Actual weight of package in kg */
    private Double weightKg;

    /**
     * Package dimensions in cm — used for volumetric weight calculation.
     * Volumetric weight (kg) = (L × W × H) / 5000  (courier industry standard)
     * Chargeable weight = max(actualWeight, volumetricWeight)
     */
    private Double lengthCm;
    private Double widthCm;
    private Double heightCm;

    /** Delivery speed: STANDARD | EXPRESS | SAME_DAY */
    private String deliverySpeed;

    /** Payment mode: ONLINE | CASH_ON_DELIVERY */
    private String paymentMode;
}
