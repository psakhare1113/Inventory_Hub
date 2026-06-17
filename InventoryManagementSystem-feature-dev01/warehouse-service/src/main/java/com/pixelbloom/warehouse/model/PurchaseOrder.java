package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.pixelbloom.warehouse.enums.POStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Purchase Order Entity (FR-20 to FR-23)
 */
@Entity
@Table(name = "purchase_orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String poNumber; // e.g., "PO-2026-00001"

    @Column(nullable = false)
    private Long supplierId;

    @Column(nullable = false)
    private Long warehouseId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private POStatus status;

    @Column(nullable = false)
    private LocalDate expectedDate;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(length = 10)
    @Builder.Default
    private String currency = "INR";

    /**
     * Credit Terms — payment किती दिवसांनी करणार.
     * Values: IMMEDIATE, NET_15, NET_30, NET_45, NET_60
     */
    @Column(length = 20)
    @Builder.Default
    private String creditTerms = "NET_30";

    /**
     * Ship To — माल कुठे deliver करायचा (warehouse address / name).
     * Example: "Bangalore Warehouse", "Pune DC", "Mumbai Hub"
     */
    @Column(length = 200)
    private String shipToAddress;

    /**
     * Receive Materials — warehouse directly receive करणार का?
     * true = Yes, false = No (third-party receiving)
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean receiveMaterials = true;

    /**
     * PO Date — PO officially create झाल्याची date.
     * createdAt पेक्षा वेगळी असू शकते (backdated POs साठी).
     */
    @Column
    private LocalDate poDate;

    @Column(length = 500)
    private String notes;

    @Column(length = 500)
    private String termsAndConditions;

    /**
     * Role of the person who created/requested this PO.
     * Values: WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN
     * Used for role-based workflow routing.
     */
    @Column(length = 50)
    @Builder.Default
    private String requestedByRole = "ADMIN";

    // Approval tracking
    private Long approvedBy;
    private LocalDateTime approvedAt;
    private String approvedByRole; // Role of approver (ADMIN / FINANCE_TEAM)

    // Receiving tracking
    private LocalDateTime firstReceivedAt;
    private LocalDateTime fullyReceivedAt;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<PurchaseOrderLine> lines = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private Long createdBy;
    private Long updatedBy;

    /**
     * Calculate total PO amount from lines
     */
    public void calculateTotalAmount() {
        this.totalAmount = lines.stream()
                .map(line -> line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQtyOrdered())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Check if PO is fully received
     */
    public boolean isFullyReceived() {
        return lines.stream()
                .allMatch(line -> line.getQtyReceived() >= line.getQtyOrdered());
    }

    /**
     * Check if PO is partially received
     */
    public boolean isPartiallyReceived() {
        return lines.stream()
                .anyMatch(line -> line.getQtyReceived() > 0 && line.getQtyReceived() < line.getQtyOrdered());
    }
}
