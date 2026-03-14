package com.pixelbloom.inventory.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_status_history")
public class InventoryStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private Inventory inventory;

    private String previousStatus;
    private String newStatus;
    private String remarks;

    private LocalDateTime changedAt;
    private Long changedBy;
}
