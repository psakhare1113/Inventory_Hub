package com.pixelbloom.inventory.model;

import com.pixelbloom.inventory.enums.InspectionStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_inspections")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String inspectionId;

    @Column(nullable = false)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    private InspectionStatus status; // APPROVED / PARTIALLY_APPROVED / REJECTED
    private String inspectedBy;

    private String inspectorRemarks;
    private String rejectionReason;

    private LocalDateTime inspectedAt;

    private LocalDateTime createdAt;
}

