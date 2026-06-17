package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.model.ProductThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductThresholdRepository extends JpaRepository<ProductThreshold, Long> {

    // All enabled thresholds — only these are checked by the scheduler
    List<ProductThreshold> findByAutoPOEnabledTrue();

    // specific product + warehouse combination
    Optional<ProductThreshold> findByProductIdAndWarehouseId(Long productId, Long warehouseId);

    // All thresholds for a specific warehouse
    List<ProductThreshold> findByWarehouseId(Long warehouseId);
}
