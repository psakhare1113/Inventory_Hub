package com.pixelbloom.inventory.model;

import com.pixelbloom.inventory.enums.ConditionStatus;
import com.pixelbloom.inventory.enums.InventoryStatus;
import com.pixelbloom.inventory.enums.PlatformStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String barcode;

    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private Long categoryId;

    @Column(nullable = false)
    private Long subcategoryId;

    @Column(nullable = false)
    private Long warehouseId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private InventoryStatus inventoryStatus; // AVAILABLE, RESERVED, SOLD, DAMAGED

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PlatformStatus platformStatus; // ENABLED, DISABLED

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ConditionStatus conditionStatus; // GOOD, CUSTOMER_DAMAGED, WAREHOUSE_DAMAGED

    @Column(nullable = false)
    private BigDecimal mrp;

    @Column(nullable = false)
    private BigDecimal showroomPrice;

    @Column(nullable = false)
    private BigDecimal buyPrice;

    @Column(nullable = false)
    private BigDecimal sellingPrice;

    @Column(nullable = false)
    private String stockSource; // SUPPLIER, CUSTOMER_RETURN

    private Boolean isCustomerReturned = false;
    private Boolean isWarehouseDamaged = false;

    private LocalDateTime orderReturnedInitiatedAt;
    @Version
    private Long version;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long createdBy;
    private Long updatedBy;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
//    private LocalDateTime transactionDate;
    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

}
