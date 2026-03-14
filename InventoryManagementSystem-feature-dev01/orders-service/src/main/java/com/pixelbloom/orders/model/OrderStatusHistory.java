package com.pixelbloom.orders.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_status_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    public Long orderId;
    private String orderNumber;
    private String previousStatus;
    private String status;
    private String remarks;
    private String changedBy;
    private LocalDateTime createdAt;
    private LocalDateTime changedAt;

}
