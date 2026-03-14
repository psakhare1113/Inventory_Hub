package com.pixelbloom.auth_server.repository;


import com.pixelbloom.auth_server.dto.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface AdminRepository extends JpaRepository<Admin, Long> {
    boolean existsByEmail(String email);

    @Modifying
    @Transactional
    void deleteByEmail(String email);
}