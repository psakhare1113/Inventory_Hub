package com.pixelbloom.orders.model;


import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.enums.ReturnStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
@Entity
@Table(name = "returns")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Return {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Public tracking reference */
    @Column(name = "return_reference", nullable = false, unique = true)
    private String returnReference;

    @Column(name = "barcode", nullable = false)
    private String barcode;

    /** Order linkage */
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "order_number", nullable = false)
    private String orderNumber;

    private Long customerId;

    /** Return state */
    @Enumerated(EnumType.STRING)
    @Column(name = "return_status", nullable = false)
    private ReturnStatus returnStatus;

    /** Customer provided reason */
    @Column(name = "return_reason", length = 500)
    private String returnReason;

    private String inspectionId;

    /** Audit fields */
    @Column(name = "returnedStartedAt", nullable = false)
    private LocalDateTime returnedStartedAt;

    @Column(name = "updatedAt_Complete")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        this.updatedAt = LocalDateTime.now();
    }

}
