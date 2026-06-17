package com.pixelbloom.orders.responseEntity;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.pixelbloom.orders.enums.OrderStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponse {

    private String orderNumber;
    private Long customerId;
    private BigDecimal totalAmount;

    // ── Amount Breakdown ──────────────────────────────────────────────────
    private BigDecimal subtotal;              // sum of item prices
    private BigDecimal taxAmount;             // GST (per-product rate)
    private BigDecimal shippingCharge;        // dynamic courier charge
    private BigDecimal warehouseHandlingCost; // picking/packing/sorting
    private BigDecimal packagingCost;         // box/bag/bubble wrap
    private BigDecimal deliveryCost;          // last-mile delivery boy
    private BigDecimal platformFee;           // servers/gateway/support
    private BigDecimal discountAmount;        // coupon/offer discount
    private String couponCode;                // coupon code used

    private String orderStatus;
    private String paymentStatus;
    private String paymentMode;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime deliveredAt;
    private String warning;
    private List<OrderItemResponse> items;

    // Warehouse & Fulfillment
    private Long warehouseId;
    private String warehouseName;
    private String packingSlipNumber;
    private String awbNumber;
    private String courierPartner;

    // Delivery partner info — shown to customer in Order History
    private String deliveryBoyName;
    private Long deliveryBoyId;

    // New field for overall review summary
    private ReviewSummary reviewSummary;

    @Data
    @Builder
    public static class ReviewSummary {
        private int totalItems;
        private int reviewedItems;
        private int pendingReviews;
        private boolean allItemsReviewed;
    }
}
