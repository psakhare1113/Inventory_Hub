package com.pixelbloom.inventory.repository;

import com.pixelbloom.inventory.enums.ReservationStatus;
import com.pixelbloom.inventory.model.InventoryReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;


import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryReservationRepository  extends JpaRepository<InventoryReservation, String> {


    List<InventoryReservation> findByOrderNumberAndReservationStatus(
            String orderNumber,
            ReservationStatus reservationStatus
    );

    List<InventoryReservation> findByOrderNumber(String orderNumber);

    List<InventoryReservation> findByOrderNumberAndProductIdAndCategoryIdAndSubcategoryId(String orderNumber, Long productId, Long categoryId, Long subcategoryId);

    Optional<InventoryReservation>
    findByOrderNumberAndBarcode(String orderNumber, String barcode);

    @Modifying
    @Query("UPDATE InventoryReservation ir SET ir.reservationStatus = :status WHERE ir.orderNumber = :orderNumber AND ir.barcode = :barcode")
    int updateStatusByOrderNumberAndBarcode(@Param("orderNumber") String orderNumber,
                                            @Param("barcode") String barcode,
                                            @Param("status") ReservationStatus status);

}