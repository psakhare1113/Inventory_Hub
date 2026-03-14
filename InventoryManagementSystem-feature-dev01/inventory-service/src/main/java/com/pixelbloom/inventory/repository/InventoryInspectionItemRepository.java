package com.pixelbloom.inventory.repository;

import com.pixelbloom.inventory.model.InventoryInspectionItem;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InventoryInspectionItemRepository extends JpaRepository<InventoryInspectionItem,Long> {
    @Query("""
    SELECT ii
    FROM InventoryInspectionItem ii
    JOIN ii.inspection i
    WHERE i.orderNumber = :orderNumber
      AND ii.barcode = :barcode
    ORDER BY i.createdAt DESC
""")
    List<InventoryInspectionItem> findLatestByOrderAndBarcodes(
            @Param("orderNumber") String orderNumber,
            @Param("barcode") String barcode
    );

}