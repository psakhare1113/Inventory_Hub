package com.pixelbloom.products.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_pricing")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pricing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(nullable = false)
    private BigDecimal mrp;

    @Column(name = "selling_price", nullable = false)
    private BigDecimal sellingPrice;

    // Supplier / purchase cost price — used by inventory buyPrice auto-fill
    // Must be < sellingPrice for positive profit
    @Column(name = "cost_price")
    private BigDecimal costPrice;

    /**
     * Packaging cost per unit (₹).
     * e.g. box, bubble wrap, label printing cost
     */
    @Column(name = "packaging_cost", precision = 10, scale = 2)
    private BigDecimal packagingCost;

    /**
     * Shipping / logistics cost per unit (₹).
     * e.g. last-mile delivery, courier charges
     */
    @Column(name = "shipping_cost", precision = 10, scale = 2)
    private BigDecimal shippingCost;

    /**
     * Profit margin per unit (₹) — decided by Sales/Business team.
     * sellingPrice = costPrice + packagingCost + shippingCost + profitMargin + (gst on costPrice)
     */
    @Column(name = "profit_margin", precision = 10, scale = 2)
    private BigDecimal profitMargin;

    @Column(name = "discount", precision = 5, scale = 2)
    private BigDecimal discount; // percentage e.g. 17.65

    // e.g. 200 ml, 1 kg, 32 inch
    @Column(name = "unit_size")
    private Double unitSize;

    @Column(name = "unit_label")
    private String unitLabel; // ml, kg, inch

    // GST rate in percentage e.g. 18.00 means 18%
    // Indian GST slabs: 0, 5, 12, 18, 28
    @Column(name = "gst_rate", nullable = false)
    private BigDecimal gstRate = BigDecimal.valueOf(18.00);

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }
    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}