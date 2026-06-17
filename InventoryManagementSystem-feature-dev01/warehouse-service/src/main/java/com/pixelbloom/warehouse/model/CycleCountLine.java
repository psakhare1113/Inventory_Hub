package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cycle Count Line Items with variance tracking (FR-101)
 */
@Entity
@Table(name = "cycle_count_lines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CycleCountLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_count_id", nullable = false)
    @JsonBackReference
    private CycleCount cycleCount;

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private Long locationId;

    @Column(length = 100)
    private String barcode;

    // System vs Physical count
    @Column(nullable = false)
    private Integer systemQty;

    @Column(nullable = false)
    private Integer physicalQty;

    @Column(nullable = false)
    private Integer variance; // physicalQty - systemQty

    @Column(length = 500)
    private String varianceReason;

    // Adjustment tracking
    @Builder.Default
    private Boolean adjustmentCreated = false;
    private Long adjustmentTransactionId;

    @Column(length = 500)
    private String notes;

    /**
     * Calculate variance percentage
     */
    public Double getVariancePercentage() {
        if (systemQty == 0) return 0.0;
        return (variance * 100.0) / systemQty;
    }

    /**
     * Check if variance is within tolerance
     */
    public boolean isWithinTolerance(Integer toleranceQty) {
        return Math.abs(variance) <= toleranceQty;
    }
}
