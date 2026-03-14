package com.pixelbloom.inventory.model;

import com.pixelbloom.inventory.enums.InspectionResult;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_inspection_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryInspectionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", nullable = false)
    private InventoryInspection inspection;

    @Column(nullable = false)
    private String barcode;

    private String orderNumber;

    @Enumerated(EnumType.STRING)
    private InspectionResult result; // APPROVED / REJECTED

    private String rejectionReason;
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    private void setTimestamps() {
        this.updatedAt = LocalDateTime.now();
    }

}
