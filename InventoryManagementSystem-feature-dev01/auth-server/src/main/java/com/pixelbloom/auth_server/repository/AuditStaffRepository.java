package com.pixelbloom.auth_server.repository;

import com.pixelbloom.auth_server.dto.AuditStaff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AuditStaffRepository extends JpaRepository<AuditStaff, Long> {

    boolean existsByEmail(String email);

    Optional<AuditStaff> findByEmail(String email);
}
