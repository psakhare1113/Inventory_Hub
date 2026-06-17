package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.enums.TransferStatus;
import com.pixelbloom.warehouse.model.InventoryTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryTransferRepository extends JpaRepository<InventoryTransfer, Long> {

    Optional<InventoryTransfer> findByTransferNumber(String transferNumber);

    List<InventoryTransfer> findBySourceWarehouseId(Long sourceWarehouseId);

    List<InventoryTransfer> findByDestinationWarehouseId(Long destinationWarehouseId);

    List<InventoryTransfer> findByStatus(TransferStatus status);

    @Query("SELECT it FROM InventoryTransfer it WHERE it.sourceWarehouseId = :warehouseId " +
           "OR it.destinationWarehouseId = :warehouseId")
    List<InventoryTransfer> findByWarehouseId(@Param("warehouseId") Long warehouseId);

    @Query("SELECT it FROM InventoryTransfer it WHERE it.status = com.pixelbloom.warehouse.enums.TransferStatus.REQUESTED " +
           "AND it.requestedBy = :userId")
    List<InventoryTransfer> findPendingTransfersByUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(it) FROM InventoryTransfer it WHERE it.status = :status")
    Long countByStatus(@Param("status") TransferStatus status);
}
