package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.model.PickList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PickListRepository extends JpaRepository<PickList, Long> {
    List<PickList> findByStatus(String status);
    Optional<PickList> findByOrderNumber(String orderNumber);
    boolean existsByOrderNumber(String orderNumber);

    // Pick lists assigned to picker/packer/shipping
    List<PickList> findByAssignedPickerId(Long pickerId);
    List<PickList> findByAssignedPackerId(Long packerId);
    List<PickList> findByAssignedShippingId(Long shippingId);

    // Email-based lookup — Customer.id ≠ WarehouseStaff.id, so email is reliable
    List<PickList> findByAssignedPackerEmailIgnoreCaseAndStatus(String email, String status);
    List<PickList> findByAssignedPickerEmailIgnoreCaseAndStatusIn(String email, List<String> statuses);
    List<PickList> findByAssignedShippingEmailIgnoreCaseAndStatus(String email, String status);

    // Unassigned pick lists (Manager dashboard)
    List<PickList> findByStatusAndAssignedPickerIdIsNull(String status);
}
