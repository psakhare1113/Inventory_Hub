package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.enums.DeliveryBoyStatusEnum;
import com.pixelbloom.orders.model.DeliveryBoyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryBoyStatusRepository extends JpaRepository<DeliveryBoyStatus, Long> {

    Optional<DeliveryBoyStatus> findByDeliveryBoyId(Long deliveryBoyId);

    Optional<DeliveryBoyStatus> findByDeliveryBoyEmail(String email);

    List<DeliveryBoyStatus> findByStatus(DeliveryBoyStatusEnum status);

    List<DeliveryBoyStatus> findByAssignedZone(String zone);

    List<DeliveryBoyStatus> findByStatusAndAssignedZone(DeliveryBoyStatusEnum status, String zone);

    /** Find best available delivery boy in a zone (least loaded, highest rated) */
    @Query("""
        SELECT d FROM DeliveryBoyStatus d
        WHERE d.status = 'AVAILABLE'
          AND d.assignedZone = :zone
          AND d.currentOrderCount < d.maxOrderCapacity
        ORDER BY d.currentOrderCount ASC, d.rating DESC
        """)
    List<DeliveryBoyStatus> findBestAvailableInZone(@Param("zone") String zone);

    /** Find any available delivery boy (no zone filter) */
    @Query("""
        SELECT d FROM DeliveryBoyStatus d
        WHERE d.status = 'AVAILABLE'
          AND d.currentOrderCount < d.maxOrderCapacity
        ORDER BY d.currentOrderCount ASC, d.rating DESC
        """)
    List<DeliveryBoyStatus> findAllAvailable();

    /** Count by status */
    long countByStatus(DeliveryBoyStatusEnum status);

    /** Count by zone */
    long countByAssignedZone(String zone);

    /** Stats per zone */
    @Query("""
        SELECT d.assignedZone as zone,
               COUNT(d) as total,
               SUM(CASE WHEN d.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
               SUM(CASE WHEN d.status = 'BUSY' THEN 1 ELSE 0 END) as busy,
               SUM(CASE WHEN d.status = 'OFFLINE' THEN 1 ELSE 0 END) as offline
        FROM DeliveryBoyStatus d
        GROUP BY d.assignedZone
        """)
    List<Object[]> getStatsByZone();

    /** Delivery boys with pending cash (COD) */
    @Query("SELECT d FROM DeliveryBoyStatus d WHERE d.cashInHand > 0 ORDER BY d.cashInHand DESC")
    List<DeliveryBoyStatus> findBoysWithPendingCash();
}
