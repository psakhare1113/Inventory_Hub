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
