package com.pixelbloom.orders.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "refund_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String orderNumber;

    private Long customerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_id", nullable = false)
    private Refund refund;

    private Long orderItemId;
    private Long productId;

    private Integer quantityRefunded;

    private BigDecimal unitPrice;
    private BigDecimal refundAmount;

    private LocalDateTime createdAt;
}