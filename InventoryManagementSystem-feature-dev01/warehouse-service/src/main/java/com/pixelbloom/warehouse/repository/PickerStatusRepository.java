package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.model.PickerStatus;
import com.pixelbloom.warehouse.model.PickerStatus.StaffOnlineStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PickerStatusRepository extends JpaRepository<PickerStatus, Long> {

    Optional<PickerStatus> findByStaffId(Long staffId);

    List<PickerStatus> findByRole(String role);

    List<PickerStatus> findByStatus(StaffOnlineStatus status);

    List<PickerStatus> findByRoleIn(List<String> roles);
}
