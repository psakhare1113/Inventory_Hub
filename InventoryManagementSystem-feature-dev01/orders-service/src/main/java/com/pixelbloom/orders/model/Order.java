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

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private LocalDateTime returnedInitiatedAt;

    private LocalDateTime deliveredAt;
}

