package com.pixelbloom.auth_server.repository;

import com.pixelbloom.auth_server.model.DeliveryBoyApplication;
import com.pixelbloom.auth_server.model.DeliveryBoyApplication.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryBoyApplicationRepository extends JpaRepository<DeliveryBoyApplication, Long> {

    boolean existsByEmail(String email);

    Optional<DeliveryBoyApplication> findByEmail(String email);

    List<DeliveryBoyApplication> findByStatusOrderByAppliedAtDesc(ApplicationStatus status);

    List<DeliveryBoyApplication> findAllByOrderByAppliedAtDesc();

    long countByStatus(ApplicationStatus status);
}
