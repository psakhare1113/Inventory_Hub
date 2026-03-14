package com.pixelbloom.inventory.repository;

import com.pixelbloom.inventory.enums.ConditionStatus;
import com.pixelbloom.inventory.enums.InventoryStatus;
import com.pixelbloom.inventory.enums.PlatformStatus;
import com.pixelbloom.inventory.model.Inventory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findByBarcode(String barcode);

    // ===== STOCK COUNTS =====
    long countByProductIdAndInventoryStatusAndPlatformStatus(
            Long productId,
            InventoryStatus inventoryStatus,
            PlatformStatus platformStatus
    );

    long countByCategoryIdAndInventoryStatusAndPlatformStatus(
            Long categoryId,
            InventoryStatus inventoryStatus,
            PlatformStatus platformStatus
    );

    long countBysubcategoryIdAndInventoryStatusAndPlatformStatus(
            Long subcategoryId,
            InventoryStatus inventoryStatus,
            PlatformStatus platformStatus
    );

    // ===== SELLABLE UNITS =====
    @Query("""
        SELECT COUNT(i)
        FROM Inventory i
        WHERE i.productId = :productId
          AND i.categoryId = :categoryId
          AND i.subcategoryId = :subcategoryId
          AND i.inventoryStatus = :inventoryStatus
          AND i.platformStatus = :platformStatus
          AND i.conditionStatus = :conditionStatus
    """)
    int countSellableUnits(
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subcategoryId") Long subcategoryId,
            @Param("inventoryStatus") InventoryStatus inventoryStatus,
            @Param("platformStatus") PlatformStatus platformStatus,
            @Param("conditionStatus") ConditionStatus conditionStatus
    );

    // ===== FETCH IDS FOR SALE =====
    @Query("""
        SELECT i.id
        FROM Inventory i
        WHERE i.productId = :productId
          AND i.categoryId = :categoryId
          AND i.subcategoryId = :subcategoryId
          AND i.inventoryStatus = :inventoryStatus
          AND i.platformStatus = :platformStatus
    """)
    List<Long> findSellableInventoryIds(
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subcategoryId") Long subcategoryId,
            @Param("inventoryStatus") InventoryStatus inventoryStatus,
            @Param("platformStatus") PlatformStatus platformStatus,
            Pageable pageable
    );

    // ===== BULK UPDATE =====
    @Modifying
    @Query("""
        UPDATE Inventory i
        SET i.inventoryStatus = :status
        WHERE i.id IN :ids
    """)
    void updateInventoryStatus(
            @Param("ids") List<Long> ids,
            @Param("status") InventoryStatus status
    );


    @Query("""
    SELECT i FROM Inventory i
    WHERE i.inventoryStatus = :inventoryStatus
      AND i.platformStatus = :platformStatus
      AND (:productId IS NULL OR i.productId = :productId)
      AND (:categoryId IS NULL OR i.categoryId = :categoryId)
      AND (:subcategoryId IS NULL OR i.subcategoryId = :subcategoryId)
""")
    List<Inventory> findAvailableStock(
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subcategoryId") Long subcategoryId,
            @Param("inventoryStatus") InventoryStatus inventoryStatus,
            @Param("platformStatus") PlatformStatus platformStatus);

    @Query("SELECT i FROM Inventory i WHERE i.productId = :productId AND i.categoryId = :categoryId AND i.subcategoryId = :subcategoryId AND i.inventoryStatus = :inventoryStatus AND i.platformStatus = :platformStatus AND i.conditionStatus = :conditionStatus ORDER BY i.id")
    List<Inventory> findTopNAvailable(@Param("productId") Long productId,
                                      @Param("categoryId") Long categoryId,
                                      @Param("subcategoryId") Long subcategoryId,
                                      @Param("inventoryStatus") InventoryStatus inventoryStatus,
                                      @Param("platformStatus") PlatformStatus platformStatus,
                                      @Param("conditionStatus") ConditionStatus conditionStatus,
                                      Pageable pageable);


    boolean existsByBarcode(String barcode);
}