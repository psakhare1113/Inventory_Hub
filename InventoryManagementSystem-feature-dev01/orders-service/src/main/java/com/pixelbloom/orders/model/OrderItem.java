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
@Table(name = "order_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderId;
    private String orderNumber;

    private Long customerId;
    private Long productId;
    private Long categoryId;
    private Long subcategoryId;

    @Column( nullable = false)
    private String barcode; // barcode

    private BigDecimal unitPrice;
    private BigDecimal totalPrice;

    /**
     * GST rate applied to this item (%) — from product pricing.
     * e.g. 5.0 for clothes, 18.0 for electronics, 0 for exempt items.
     */
    private BigDecimal gstRate;

    /**
     * GST amount for this item (₹) = unitPrice × gstRate / 100
     * Stored per item for invoice/audit purposes.
     */
    private BigDecimal gstAmount;

    @Enumerated(EnumType.STRING)
    private OrderStatus orderStatus;

    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus;

    private int refundedQuantity;
    private int quantity=1;


    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deliveredAt;

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    private LocalDateTime returnedInitiatedAt;
}
