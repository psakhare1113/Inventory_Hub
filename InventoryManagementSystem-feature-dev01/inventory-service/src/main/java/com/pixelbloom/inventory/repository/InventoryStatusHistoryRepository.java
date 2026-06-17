package com.pixelbloom.inventory.repository;

import com.pixelbloom.inventory.model.InventoryStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryStatusHistoryRepository extends JpaRepository<InventoryStatusHistory, Long> {

    List<InventoryStatusHistory> findByInventoryIdOrderByChangedAtDesc(Long inventoryId);
}
