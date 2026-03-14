package com.pixelbloom.inventory.repository;

import com.pixelbloom.inventory.model.InventoryInspection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InventoryInspectionRepository extends JpaRepository<InventoryInspection,Long> {

    Optional<InventoryInspection> findTopByOrderNumberOrderByCreatedAtDesc(String orderNumber);
}
