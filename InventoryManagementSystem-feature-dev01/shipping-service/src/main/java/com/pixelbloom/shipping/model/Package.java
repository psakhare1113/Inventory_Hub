package com.pixelbloom.shipping.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "packages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Package {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String orderNumber;

    private Long customerId;

    /** Weight in kg */
    private Double weightKg;

    /** Dimensions in cm */
    private Double lengthCm;
    private Double widthCm;
    private Double heightCm;

    /** Packing slip / label number */
    private String packingSlipNumber;

    /** Who packed it */
    private String packedBy;

    /** Any notes added during packing */
    private String notes;

    /**
     * Current status of the package:
     * PENDING → PACKED → SHIPPED → DELIVERED
     */
    private String status;

    private LocalDateTime createdAt;
    private LocalDateTime packedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
}
