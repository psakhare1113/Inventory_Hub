package com.pixelbloom.warehouse.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Pack Detail — stores packing information filled by Packer.
 *
 * One PackDetail per PickList (one-to-one via pickListId).
 * Stored in `pack_details` table.
 *
 * Fields:
 *   boxSize        — XS / S / M / L / XL / XXL / custom
 *   packagingType  — standard / bubble_wrap / fragile / poly_bag / gift / envelope
 *   weight         — total weight in kg
 *   dimensions     — custom dimensions e.g. "30x20x15" (only if boxSize=custom)
 *   notes          — packer notes
 *   packedBy       — packer name (from session)
 *   packedAt       — timestamp when packing was submitted
 */
@Entity
@Table(name = "pack_details")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PackDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to pick_lists.id — one pack detail per pick list */
    @Column(nullable = false, unique = true)
    private Long pickListId;

    /** Order number — denormalized for easy lookup */
    @Column(nullable = false)
    private String orderNumber;

    /** Customer ID — denormalized for reporting */
    private Long customerId;

    // ── Box / Packaging ──────────────────────────────────────────────────────

    /** Box size: XS | S | M | L | XL | XXL | custom */
    @Column(length = 20)
    private String boxSize;

    /** Packaging type: standard | bubble_wrap | fragile | poly_bag | gift | envelope */
    @Column(length = 50)
    private String packagingType;

    /** Total weight in kg */
    private Double weight;

    /** Custom dimensions — only filled when boxSize = 'custom' (e.g. "30x20x15") */
    @Column(length = 100)
    private String dimensions;

    /** Packer notes / special instructions */
    @Column(length = 500)
    private String notes;

    // ── Audit ────────────────────────────────────────────────────────────────

    /** Name of the packer who submitted */
    @Column(length = 100)
    private String packedBy;

    /** Packer's staff ID */
    private Long packedById;

    /** When packing details were submitted */
    private LocalDateTime packedAt;

    // ── Shipping info (filled when order is shipped) ──────────────────────────

    /** Courier/carrier name — filled by Shipping Dashboard */
    @Column(length = 50)
    private String carrier;

    /** AWB / tracking number */
    @Column(length = 100)
    private String trackingNumber;

    /** Shipping cost in ₹ */
    private Double shippingCost;

    /** When order was shipped */
    private LocalDateTime shippedAt;

    @PrePersist
    void onCreate() {
        if (this.packedAt == null) this.packedAt = LocalDateTime.now();
    }
}
