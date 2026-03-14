package com.pixelbloom.payment.entity;

import com.pixelbloom.payment.constants.PaymentStatus;
import jakarta.persistence.*;
import lombok.Data;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Data
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long customerId;
    private String orderNumber;

    private BigDecimal amount;

    private String currency;

    private String paymentMethod; // UPI, CARD

    private String paymentTxnId;

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

  private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}