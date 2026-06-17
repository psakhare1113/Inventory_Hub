package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.pixelbloom.warehouse.enums.TransferStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Inventory Transfer between warehouses/locations (FR-80)
 */
@Entity
@Table(name = "inventory_transfers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class InventoryTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String transferNumber; // e.g., "TRF-2026-00001"

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TransferStatus status;

    // Source and destination
    @Column(nullable = false)
    private Long sourceWarehouseId;

    private Long sourceLocationId;

    @Column(nullable = false)
    private Long destinationWarehouseId;

    private Long destinationLocationId;

    // Transfer type
    @Column(nullable = false, length = 50)
    private String transferType; // INTER_WAREHOUSE, INTRA_WAREHOUSE, LOCATION_TO_LOCATION

    @Column(length = 500)
    private String reason;

    // Approval tracking
    private Long requestedBy;
    private LocalDateTime requestedAt;

    private Long approvedBy;
    private LocalDateTime approvedAt;

    // Execution tracking
    private Long pickedBy;
    private LocalDateTime pickedAt;

    private Long receivedBy;
    private LocalDateTime receivedAt;

    @Column(length = 500)
    private String notes;

    @OneToMany(mappedBy = "transfer", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<TransferLine> lines = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /**
     * Check if all lines are received
     */
    public boolean isFullyReceived() {
        return lines.stream().allMatch(line -> line.getQtyReceived() >= line.getQtyTransferred());
    }
}
