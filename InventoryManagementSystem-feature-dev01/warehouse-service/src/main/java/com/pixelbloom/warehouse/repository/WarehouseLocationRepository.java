package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.enums.LocationType;
import com.pixelbloom.warehouse.model.WarehouseLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseLocationRepository extends JpaRepository<WarehouseLocation, Long> {

    Optional<WarehouseLocation> findByLocationCode(String locationCode);

    List<WarehouseLocation> findByWarehouseId(Long warehouseId);

    List<WarehouseLocation> findByWarehouseIdAndLocationType(Long warehouseId, LocationType locationType);

    List<WarehouseLocation> findByWarehouseIdAndIsActiveTrue(Long warehouseId);

    List<WarehouseLocation> findByWarehouseIdAndIsAvailableTrue(Long warehouseId);

    @Query("SELECT wl FROM WarehouseLocation wl WHERE wl.warehouseId = :warehouseId " +
           "AND wl.isActive = true AND wl.isAvailable = true " +
           "AND (wl.maxCapacity - wl.currentCapacity) >= :requiredCapacity " +
           "ORDER BY wl.currentCapacity ASC")
    List<WarehouseLocation> findAvailableLocationsWithCapacity(
            @Param("warehouseId") Long warehouseId,
            @Param("requiredCapacity") BigDecimal requiredCapacity);

    // preferred_product_id was removed from the schema (see migrate_warehouse_locations.sql).
    // This method now always returns empty so PutawayService falls through to capacity-based selection.
    default List<WarehouseLocation> findPreferredLocationsForProduct(Long warehouseId, Long productId) {
        return java.util.Collections.emptyList();
    }

    @Query("SELECT SUM(wl.currentCapacity) FROM WarehouseLocation wl " +
           "WHERE wl.warehouseId = :warehouseId AND wl.isActive = true")
    BigDecimal getTotalUsedCapacity(@Param("warehouseId") Long warehouseId);

    @Query("SELECT SUM(wl.maxCapacity) FROM WarehouseLocation wl " +
           "WHERE wl.warehouseId = :warehouseId AND wl.isActive = true")
    BigDecimal getTotalMaxCapacity(@Param("warehouseId") Long warehouseId);
}
