package com.pixelbloom.auth_server.repository;

import com.pixelbloom.auth_server.dto.DeliveryBoy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface DeliveryBoyRepository extends JpaRepository<DeliveryBoy, Long> {
    boolean existsByEmail(String email);
    Optional<DeliveryBoy> findByEmail(String email);

    @Modifying
    @Transactional
    void deleteByEmail(String email);
}
