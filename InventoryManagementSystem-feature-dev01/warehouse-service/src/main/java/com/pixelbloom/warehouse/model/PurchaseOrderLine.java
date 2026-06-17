package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Purchase Order Line Items (FR-21)
 */
@Entity
@Table(name = "purchase_order_lines")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_id", nullable = false)
    @JsonBackReference
    private PurchaseOrder purchaseOrder;

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false, length = 100)
    private String productName;

    @Column(length = 50)
    private String sku;

    @Column(nullable = false)
    private Integer qtyOrdered;

    @Column(nullable = false)
    @Builder.Default
    private Integer qtyReceived = 0;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(length = 500)
    private String notes;

    /**
     * Calculate remaining quantity to receive
     */
    public Integer getRemainingQty() {
        return qtyOrdered - qtyReceived;
    }

    /**
     * Check if line is fully received
     */
    public boolean isFullyReceived() {
        return qtyReceived >= qtyOrdered;
    }

    /**
     * Calculate line total
     */
    public BigDecimal getLineTotal() {
        return unitPrice.multiply(BigDecimal.valueOf(qtyOrdered));
    }
}
