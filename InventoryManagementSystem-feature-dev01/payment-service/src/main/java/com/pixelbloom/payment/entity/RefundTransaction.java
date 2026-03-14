package com.pixelbloom.payment.entity;

import com.pixelbloom.payment.constants.RefundStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "refund_transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long customerId;

    private String orderNumber;

    private String refundTxnId;

    private BigDecimal refundAmount;

    private String refundReason;

    @Enumerated(EnumType.STRING)
    private RefundStatus refundStatus;

   // private LocalDateTime createdAt;
    private LocalDateTime refundedAt;

    @PrePersist
    void onCreate() {
       // this.createdAt = LocalDateTime.now();
        this.refundedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        this.refundedAt = LocalDateTime.now();
    }

}
