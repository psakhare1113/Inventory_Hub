package com.pixelbloom.orders.model;

import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
@Entity
@Table(name = "orders")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orderNumber;

    // Customer Info
    private Long customerId; // UI to use it from token and pass here


    @Enumerated(EnumType.STRING)
    private OrderStatus orderStatus;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus;

    private BigDecimal totalAmount;
    private String currency;
    private String paymentMode;

    // ── Order Amount Breakdown ────────────────────────────────────────────
    /** Sum of (sellingPrice × qty) for all items — before tax/shipping */
    private BigDecimal subtotal;

    /** GST amount — calculated per product using product-level gstRate */
    private BigDecimal taxAmount;

    /** Shipping charge (dynamic — from shipping-service) */
    private BigDecimal shippingCharge;

    /** Warehouse handling cost — picking, scanning, packing, sorting */
    @Builder.Default
    private BigDecimal warehouseHandlingCost = BigDecimal.ZERO;

    /** Packaging cost — box, bag, bubble wrap, barcode sticker */
    @Builder.Default
    private BigDecimal packagingCost = BigDecimal.ZERO;

    /** Last-mile delivery cost — delivery boy / courier partner final leg */
    @Builder.Default
    private BigDecimal deliveryCost = BigDecimal.ZERO;

    /** Platform fee — servers, payment gateway, app maintenance */
    @Builder.Default
    private BigDecimal platformFee = BigDecimal.ZERO;

    /** Discount applied — coupon / offer */
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    /** Coupon code used (if any) */
    private String couponCode;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private LocalDateTime returnedInitiatedAt;
    private LocalDateTime deliveredAt;

    // Cancellation
    private String cancellationReason;
    private LocalDateTime cancelledAt;

    // Warehouse & Fulfillment tracking
    private Long warehouseId;
    private String warehouseName;
    private String packingSlipNumber;   // e.g. PKG-2024-00123
    private String awbNumber;           // Courier tracking number
    private String courierPartner;      // e.g. Delhivery, BlueDart

    // Shipping details captured at order creation
    private String deliveryPincode;     // Customer delivery pincode
    private String deliverySpeed;       // STANDARD | EXPRESS | SAME_DAY
}

