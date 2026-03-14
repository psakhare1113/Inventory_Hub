package com.pixelbloom.orders.model;

import com.pixelbloom.orders.enums.RefundStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "refunds")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Refund {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String refundReference;

    private Long customerId;

    @Column(nullable = false)
    private Long orderId;

    @Column(nullable = false)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    private RefundStatus refundStatus;

    private String refundReason;

    private BigDecimal totalRefundAmount;

    private String currency;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
