package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.enums.POStatus;
import com.pixelbloom.warehouse.model.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

    Optional<PurchaseOrder> findByPoNumber(String poNumber);

    List<PurchaseOrder> findBySupplierId(Long supplierId);

    List<PurchaseOrder> findByWarehouseId(Long warehouseId);

    List<PurchaseOrder> findByStatus(POStatus status);

    List<PurchaseOrder> findByStatusIn(List<POStatus> statuses);

    @Query("SELECT po FROM PurchaseOrder po WHERE po.expectedDate BETWEEN :startDate AND :endDate")
    List<PurchaseOrder> findByExpectedDateBetween(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT po FROM PurchaseOrder po WHERE po.status = com.pixelbloom.warehouse.enums.POStatus.APPROVED " +
           "AND po.expectedDate < :date")
    List<PurchaseOrder> findOverduePurchaseOrders(@Param("date") LocalDate date);

    @Query("SELECT COUNT(po) FROM PurchaseOrder po WHERE po.status = :status")
    Long countByStatus(@Param("status") POStatus status);
}
