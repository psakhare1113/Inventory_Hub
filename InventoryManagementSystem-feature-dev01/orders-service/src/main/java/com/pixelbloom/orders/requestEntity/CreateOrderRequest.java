package com.pixelbloom.orders.requestEntity;

import com.pixelbloom.orders.model.CreateOrderItemRequest;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateOrderRequest {

    private Long customerId;
    private String paymentMode;
    private List<CreateOrderItemRequest> items;

    // ── Shipping info from checkout page ──────────────────────────────────
    /** Customer delivery pincode — used to calculate/verify shipping charge */
    private String deliveryPincode;

    /**
     * Shipping charge calculated on frontend via /api/shipping/calculate.
     * If null or 0, backend falls back to ₹50 default.
     */
    private BigDecimal shippingCharge;

    /** Courier partner selected by customer (e.g. "Delhivery", "Blue Dart") */
    private String courierPartner;

    /** Delivery speed selected: STANDARD | EXPRESS | SAME_DAY */
    private String deliverySpeed;

    // ── Discount / Coupon ─────────────────────────────────────────────────
    /** Coupon code entered by customer (optional) */
    private String couponCode;

    /**
     * Discount amount to apply (₹).
     * Validated on backend — cannot exceed subtotal.
     */
    private BigDecimal discountAmount;

    // ── Fixed charges (sent from frontend config or backend defaults) ─────
    /**
     * Warehouse handling cost — picking, scanning, packing.
     * If null, backend uses default ₹15.
     */
    private BigDecimal warehouseHandlingCost;

    /**
     * Packaging cost — box, bag, bubble wrap, barcode sticker.
     * If null, backend uses default ₹20.
     */
    private BigDecimal packagingCost;

    /**
     * Last-mile delivery cost — delivery boy / courier partner final leg.
     * If null, backend uses default ₹25.
     */
    private BigDecimal deliveryCost;

    /**
     * Platform fee — servers, payment gateway, app maintenance.
     * If null, backend uses default ₹10.
     */
    private BigDecimal platformFee;
}
