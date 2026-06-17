package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.enums.GRNStatus;
import com.pixelbloom.warehouse.model.GoodsReceiptNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GoodsReceiptNoteRepository extends JpaRepository<GoodsReceiptNote, Long> {

    Optional<GoodsReceiptNote> findByGrnNumber(String grnNumber);

    List<GoodsReceiptNote> findByPoId(Long poId);

    List<GoodsReceiptNote> findByWarehouseId(Long warehouseId);

    List<GoodsReceiptNote> findByStatus(GRNStatus status);

    @Query("SELECT grn FROM GoodsReceiptNote grn WHERE grn.receivedAt BETWEEN :startDate AND :endDate")
    List<GoodsReceiptNote> findByReceivedAtBetween(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT grn FROM GoodsReceiptNote grn WHERE grn.putawayCompleted = false " +
           "AND grn.status = com.pixelbloom.warehouse.enums.GRNStatus.INSPECTED")
    List<GoodsReceiptNote> findPendingPutaway();

    @Query("SELECT COUNT(grn) FROM GoodsReceiptNote grn WHERE grn.status = :status")
    Long countByStatus(@Param("status") GRNStatus status);
}
