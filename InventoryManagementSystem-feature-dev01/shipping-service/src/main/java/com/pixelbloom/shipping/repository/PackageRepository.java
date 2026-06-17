package com.pixelbloom.shipping.repository;

import com.pixelbloom.shipping.model.Package;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PackageRepository extends JpaRepository<Package, Long> {

    Optional<Package> findByOrderNumber(String orderNumber);

    List<Package> findByStatus(String status);

    List<Package> findByCustomerId(Long customerId);

    boolean existsByOrderNumber(String orderNumber);
}
