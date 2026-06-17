package com.pixelbloom.shipping.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Optional request body for the pack endpoint.
 * All fields are optional — only provided values are applied.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PackageRequest {
    private Long customerId;
    private Double weightKg;
    private Double lengthCm;
    private Double widthCm;
    private Double heightCm;
    private String packingSlipNumber;
    private String packedBy;
    private String notes;
}
