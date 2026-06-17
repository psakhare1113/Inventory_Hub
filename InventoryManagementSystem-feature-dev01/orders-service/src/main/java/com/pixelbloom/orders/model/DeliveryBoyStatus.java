package com.pixelbloom.orders.model;

import com.pixelbloom.orders.enums.DeliveryBoyStatusEnum;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Real-time status tracking for delivery boys.
 * Tracks availability, location, performance metrics.
 * Table: delivery_boy_status
 */
@Entity
@Table(name = "delivery_boy_status")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryBoyStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** customerId from auth-service */
    @Column(nullable = false)
    private Long deliveryBoyId;

    @Column(nullable = false)
    private String deliveryBoyName;

    @Column(nullable = false, unique = true)
    private String deliveryBoyEmail;

    private String deliveryBoyPhone;

    // ── Real-time status ──────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliveryBoyStatusEnum status;

    /** Number of active deliveries currently assigned */
    @Column(columnDefinition = "INT DEFAULT 0")
    private Integer currentOrderCount;

    /** Maximum concurrent deliveries this boy can handle */
    @Column(columnDefinition = "INT DEFAULT 5")
    private Integer maxOrderCapacity;

    // ── Zone assignment ───────────────────────────────────────────────────────

    /** Assigned delivery zone (e.g., Zone A, Pune Central) */
    private String assignedZone;

    /** GPS coordinates for real-time tracking */
    @Column(precision = 10, scale = 8)
    private BigDecimal currentLatitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal currentLongitude;

    private LocalDateTime lastLocationUpdate;

    // ── Performance metrics ───────────────────────────────────────────────────

    @Column(columnDefinition = "INT DEFAULT 0")
    private Integer totalDeliveriesCompleted;

    @Column(columnDefinition = "INT DEFAULT 0")
    private Integer totalDeliveriesFailed;

    /** Average delivery time in minutes */
    private Integer averageDeliveryTimeMinutes;

    /** Customer rating (1-5) */
    @Column(precision = 3, scale = 2, columnDefinition = "DECIMAL(3,2) DEFAULT 5.00")
    private BigDecimal rating;

    // ── Cash on Delivery tracking ─────────────────────────────────────────────

    /** COD cash currently with delivery boy */
    @Column(precision = 10, scale = 2, columnDefinition = "DECIMAL(10,2) DEFAULT 0.00")
    private BigDecimal cashInHand;

    /** Last time delivery boy deposited cash to admin */
    private LocalDateTime lastCashDepositAt;

    // ── Timestamps ────────────────────────────────────────────────────────────

    private LocalDateTime lastOnlineAt;
    private LocalDateTime lastOfflineAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) this.status = DeliveryBoyStatusEnum.OFFLINE;
        if (this.currentOrderCount == null) this.currentOrderCount = 0;
        if (this.maxOrderCapacity == null) this.maxOrderCapacity = 5;
        if (this.totalDeliveriesCompleted == null) this.totalDeliveriesCompleted = 0;
        if (this.totalDeliveriesFailed == null) this.totalDeliveriesFailed = 0;
        if (this.rating == null) this.rating = new BigDecimal("5.00");
        if (this.cashInHand == null) this.cashInHand = BigDecimal.ZERO;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ── Helper methods ────────────────────────────────────────────────────────

    /**
     * Calculate success rate percentage
     */
    public Double getSuccessRate() {
        int total = totalDeliveriesCompleted + totalDeliveriesFailed;
        if (total == 0) return 100.0;
        return (totalDeliveriesCompleted * 100.0) / total;
    }

    /**
     * Check if delivery boy can accept more orders
     */
    public boolean canAcceptOrder() {
        return status == DeliveryBoyStatusEnum.AVAILABLE 
            && currentOrderCount < maxOrderCapacity;
    }

    /**
     * Increment active order count
     */
    public void assignOrder() {
        this.currentOrderCount++;
        if (this.currentOrderCount >= this.maxOrderCapacity) {
            this.status = DeliveryBoyStatusEnum.BUSY;
        }
    }

    /**
     * Decrement active order count
     */
    public void completeOrder() {
        this.currentOrderCount = Math.max(0, this.currentOrderCount - 1);
        if (this.currentOrderCount < this.maxOrderCapacity && this.status == DeliveryBoyStatusEnum.BUSY) {
            this.status = DeliveryBoyStatusEnum.AVAILABLE;
        }
        this.totalDeliveriesCompleted++;
    }

    /**
     * Mark delivery as failed
     */
    public void failOrder() {
        this.currentOrderCount = Math.max(0, this.currentOrderCount - 1);
        if (this.currentOrderCount < this.maxOrderCapacity && this.status == DeliveryBoyStatusEnum.BUSY) {
            this.status = DeliveryBoyStatusEnum.AVAILABLE;
        }
        this.totalDeliveriesFailed++;
    }
}
