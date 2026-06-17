package com.pixelbloom.warehouse.model;

import com.pixelbloom.warehouse.enums.LocationType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Warehouse Location Hierarchy (FR-40 to FR-42)
 * Structure: Warehouse -> Area -> Aisle -> Bay -> Level -> Bin
 */
@Entity
@Table(name = "warehouse_locations", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"warehouse_id", "location_code"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class WarehouseLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long warehouseId;

    @Column(nullable = false, unique = true, length = 50)
    private String locationCode; // e.g., "WH01-A-01-B-02-L3-BIN05"

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private LocationType locationType;

    // Hierarchy fields
    private String area;        // e.g., "A", "B", "C"
    private String aisle;       // e.g., "01", "02"
    private String bay;         // e.g., "A", "B"
    private String level;       // e.g., "L1", "L2", "L3"
    private String binCode;     // e.g., "BIN01", "BIN02"

    // Capacity management
    @Column(nullable = false)
    private String capacityUom; // e.g., "PALLETS", "CUBIC_METERS", "UNITS"

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal maxCapacity;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal currentCapacity;

    // Status
    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isAvailable = true; // Available for putaway

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(insertable = false)
    private LocalDateTime updatedAt;

    private Long createdBy;

    @Column(insertable = false)
    private Long updatedBy;

    /**
     * Calculate available capacity percentage
     */
    public BigDecimal getAvailableCapacityPercentage() {
        if (maxCapacity.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return currentCapacity.divide(maxCapacity, 2, BigDecimal.ROUND_HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    /**
     * Check if location has enough capacity
     */
    public boolean hasCapacity(BigDecimal requiredCapacity) {
        BigDecimal available = maxCapacity.subtract(currentCapacity);
        return available.compareTo(requiredCapacity) >= 0;
    }
}
