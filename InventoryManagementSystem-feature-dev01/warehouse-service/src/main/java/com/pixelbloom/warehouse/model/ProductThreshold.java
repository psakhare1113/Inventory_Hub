package com.pixelbloom.warehouse.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * ProductThreshold — Auto PO साठी per-product configuration
 *
 * जेव्हा stock < lowStockThreshold होतो,
 * system automatically एक DRAFT PO create करतो
 * quantity = reorderQty सह.
 *
 * Example:
 *   productId     = 101  (T-Shirt)
 *   lowStockThreshold = 50   ← stock 50 पेक्षा कमी झाला तर PO create करा
 *   reorderQty    = 500  ← 500 units order करा
 *   defaultSupplierId = 3   ← या supplier कडून
 *   defaultWarehouseId = 1  ← या warehouse साठी
 *   autoPOEnabled = true ← auto PO on/off switch
 */
@Entity
@Table(name = "product_thresholds",
       uniqueConstraints = @UniqueConstraint(columnNames = {"product_id", "warehouse_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ProductThreshold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_name", length = 200)
    private String productName; // display साठी — denormalized

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    /**
     * Stock या level पेक्षा कमी झाला तर auto PO trigger होतो.
     * Default: 50
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer lowStockThreshold = 50;

    /**
     * Auto PO मध्ये किती units order करायचे.
     * Default: 100
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer reorderQty = 100;

    /**
     * कोणत्या supplier कडून order करायचा.
     */
    @Column(name = "default_supplier_id")
    private Long defaultSupplierId;

    /**
     * Auto PO on/off switch.
     * false केला तर system PO create करणार नाही.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean autoPOEnabled = true;

    /**
     * Unit price for auto PO lines.
     * Supplier कडून expected price.
     */
    @Column(precision = 10, scale = 2)
    @Builder.Default
    private java.math.BigDecimal unitPrice = java.math.BigDecimal.ZERO;

    /**
     * Last time auto PO was created for this product.
     * Duplicate PO टाळण्यासाठी वापरतो.
     */
    private LocalDateTime lastAutoPOCreatedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
