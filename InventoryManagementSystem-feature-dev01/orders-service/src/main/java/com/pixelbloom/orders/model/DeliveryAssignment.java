package com.pixelbloom.orders.model;

import com.pixelbloom.orders.enums.DeliveryStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Tracks every delivery assignment made to a delivery boy.
 * One row per order-delivery-boy assignment.
 * Table: delivery_assignments
 */
@Entity
@Table(name = "delivery_assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The order being delivered */
    @Column(nullable = false)
    private String orderNumber;

    /** customerId of the delivery boy (from auth-service) */
    @Column(nullable = false)
    private Long deliveryBoyId;

    /** Name of the delivery boy — denormalized for quick display */
    private String deliveryBoyName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private DeliveryStatus deliveryStatus;

    /** When admin assigned this order to the delivery boy */
    private LocalDateTime assignedAt;

    /** When delivery boy picked up from warehouse (SHIPPED → OUT_FOR_DELIVERY) */
    private LocalDateTime pickedUpAt;

    /** When delivery boy marked as delivered */
    private LocalDateTime deliveredAt;

    /** Optional: delivery notes / remarks by delivery boy */
    private String deliveryRemarks;

    /** For COD: whether cash was collected */
    private Boolean cashCollected;

    /** Amount collected (for COD orders) */
    private java.math.BigDecimal amountCollected;

    // ── Cash Refund Task fields ───────────────────────────────────────────────

    /**
     * true = this row is a cash-refund task (not a delivery task).
     * Delivery boy needs to visit customer and hand back cash.
     */
    private Boolean isCashRefundTask;

    /** refundReference from the refunds table — links back to the refund */
    private String refundReference;

    /** Amount to hand back to customer */
    private java.math.BigDecimal cashRefundAmount;

    /** When delivery boy confirmed cash was handed to customer */
    private LocalDateTime cashRefundHandedAt;

    // ── Return Pickup Task fields ─────────────────────────────────────────────

    /**
     * true = this row is a return-pickup task (not a regular delivery task).
     * Delivery boy needs to visit customer and collect the returned item.
     */
    private Boolean isReturnPickupTask;

    /** returnReference from the returns table — links back to the return */
    private String returnReference;

    /** When delivery boy confirmed item was collected from customer */
    private LocalDateTime returnPickupCompletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt  = LocalDateTime.now();
        this.updatedAt  = LocalDateTime.now();
        if (this.assignedAt == null) this.assignedAt = LocalDateTime.now();
        if (this.deliveryStatus == null) this.deliveryStatus = DeliveryStatus.ASSIGNED;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
