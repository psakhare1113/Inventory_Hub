package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Transfer Line Items (FR-80)
 */
@Entity
@Table(name = "transfer_lines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_id", nullable = false)
    @JsonBackReference
    private InventoryTransfer transfer;

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private Integer qtyTransferred;

    @Column(nullable = false)
    @Builder.Default
    private Integer qtyReceived = 0;

    @Column(length = 100)
    private String barcode;

    @Column(length = 100)
    private String lotNumber;

    @Column(length = 500)
    private String notes;

    /**
     * Check if line is fully received
     */
    public boolean isFullyReceived() {
        return qtyReceived >= qtyTransferred;
    }
}
