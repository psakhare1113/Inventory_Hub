package com.pixelbloom.orders.model;

import com.pixelbloom.orders.enums.AggregateType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_outbox")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private AggregateType aggregateType;   // ORDER / RETURN / REFUND

    private String aggregateId;               // orderId / returnId / refundId

    private String event;

    private LocalDateTime processedAt;

    private String status = "NEW"; // NEW, PROCESSED, FAILED

    private Integer retryCount = 0;


    private String eventType;
    private Integer eventVersion;

    @Column(columnDefinition = "json")
    private String payload;


    private String failureReason;// NEW, SENT, FAILED
    private LocalDateTime createdAt;
}