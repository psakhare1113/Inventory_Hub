package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.enums.DeliveryStatus;
import com.pixelbloom.orders.model.DeliveryAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {

    /** All assignments for a specific delivery boy */
    List<DeliveryAssignment> findByDeliveryBoyId(Long deliveryBoyId);

    /** All assignments for a delivery boy filtered by status */
    List<DeliveryAssignment> findByDeliveryBoyIdAndDeliveryStatus(Long deliveryBoyId, DeliveryStatus status);

    /** All assignments across all delivery boys for a given status */
    List<DeliveryAssignment> findByDeliveryStatus(DeliveryStatus status);

    /** Latest assignment for a specific order */
    Optional<DeliveryAssignment> findTopByOrderNumberOrderByAssignedAtDesc(String orderNumber);

    /** All assignments for a specific order (history of reassignments) */
    List<DeliveryAssignment> findByOrderNumberOrderByAssignedAtDesc(String orderNumber);

    /** Check if an order is already assigned */
    boolean existsByOrderNumberAndDeliveryStatusNot(String orderNumber, DeliveryStatus status);

    // ── Cash Refund Tasks ─────────────────────────────────────────────────────

    /** All pending cash refund tasks for a delivery boy — explicit query avoids BIT(1) issues */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.deliveryBoyId = :deliveryBoyId AND a.isCashRefundTask = true AND a.deliveryStatus = :status")
    List<DeliveryAssignment> findByDeliveryBoyIdAndIsCashRefundTaskTrueAndDeliveryStatus(
            @Param("deliveryBoyId") Long deliveryBoyId,
            @Param("status") DeliveryStatus status);

    /** All cash refund tasks (admin view) */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.isCashRefundTask = true")
    List<DeliveryAssignment> findByIsCashRefundTaskTrue();

    // ── Return Pickup Tasks ───────────────────────────────────────────────────

    /** All pending return pickup tasks for a delivery boy — explicit query avoids BIT(1) issues */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.deliveryBoyId = :deliveryBoyId AND a.isReturnPickupTask = true AND a.deliveryStatus = :status")
    List<DeliveryAssignment> findByDeliveryBoyIdAndIsReturnPickupTaskTrueAndDeliveryStatus(
            @Param("deliveryBoyId") Long deliveryBoyId,
            @Param("status") DeliveryStatus status);

    /** All return pickup tasks (admin view) */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.isReturnPickupTask = true")
    List<DeliveryAssignment> findByIsReturnPickupTaskTrue();

    /** Find return pickup task by returnReference */
    @Query("SELECT a FROM DeliveryAssignment a WHERE a.returnReference = :returnReference AND a.isReturnPickupTask = true")
    Optional<DeliveryAssignment> findByReturnReferenceAndIsReturnPickupTaskTrue(
            @Param("returnReference") String returnReference);
}
