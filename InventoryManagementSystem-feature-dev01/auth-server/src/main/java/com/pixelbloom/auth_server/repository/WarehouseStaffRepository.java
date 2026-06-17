package com.pixelbloom.auth_server.repository;

import com.pixelbloom.auth_server.dto.WarehouseStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface WarehouseStaffRepository extends JpaRepository<WarehouseStaff, Long> {

    boolean existsByEmail(String email);

    Optional<WarehouseStaff> findByEmail(String email);

    @Modifying
    @Transactional
    void deleteByEmail(String email);
}
