package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * GRN Line Items with Lot/Batch tracking (FR-31)
 */
@Entity
@Table(name = "grn_lines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GRNLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grn_id", nullable = false)
    @JsonBackReference
    private GoodsReceiptNote grn;

    @Column(nullable = false)
    private Long poLineId;

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private Integer qtyReceived;

    @Column(nullable = false)
    @Builder.Default
    private Integer qtyAccepted = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer qtyRejected = 0;

    // Lot/Batch tracking (FR-31)
    @Column(length = 100)
    private String lotNumber;

    @Column(length = 100)
    private String batchNumber;

    private LocalDate expirationDate;

    @Column(name = "item_condition", length = 50)
    private String condition; // GOOD, DAMAGED, DEFECTIVE

    // Putaway tracking (FR-32, FR-33)
    private Long suggestedLocationId;
    private Long actualLocationId;
    
    @Builder.Default
    private Boolean putawayCompleted = false;

    @Column(length = 500)
    private String notes;

    /**
     * Calculate rejected percentage
     */
    public Double getRejectionRate() {
        if (qtyReceived == 0) return 0.0;
        return (qtyRejected * 100.0) / qtyReceived;
    }
}
