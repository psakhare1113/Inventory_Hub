package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.enums.CycleCountStatus;
import com.pixelbloom.warehouse.model.CycleCount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CycleCountRepository extends JpaRepository<CycleCount, Long> {

    Optional<CycleCount> findByCycleCountNumber(String cycleCountNumber);

    List<CycleCount> findByWarehouseId(Long warehouseId);

    List<CycleCount> findByStatus(CycleCountStatus status);

    @Query("SELECT cc FROM CycleCount cc WHERE cc.scheduledDate BETWEEN :startDate AND :endDate")
    List<CycleCount> findByScheduledDateBetween(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query("SELECT cc FROM CycleCount cc WHERE cc.status IN (" +
           "com.pixelbloom.warehouse.enums.CycleCountStatus.SCHEDULED, " +
           "com.pixelbloom.warehouse.enums.CycleCountStatus.IN_PROGRESS) " +
           "AND cc.scheduledDate <= :date")
    List<CycleCount> findDueCycleCounts(@Param("date") LocalDate date);

    @Query("SELECT cc FROM CycleCount cc WHERE cc.warehouseId = :warehouseId " +
           "AND cc.locationId = :locationId AND cc.status IN (com.pixelbloom.warehouse.enums.CycleCountStatus.SCHEDULED, com.pixelbloom.warehouse.enums.CycleCountStatus.IN_PROGRESS)")
    List<CycleCount> findActiveCycleCountsForLocation(
            @Param("warehouseId") Long warehouseId,
            @Param("locationId") Long locationId);

    @Query("SELECT COUNT(cc) FROM CycleCount cc WHERE cc.status = :status")
    Long countByStatus(@Param("status") CycleCountStatus status);
}
