package com.pixelbloom.warehouse.repository;

import com.pixelbloom.warehouse.model.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {
    
    Optional<Warehouse> findByCode(String code);
    
    List<Warehouse> findByIsActiveTrue();
    
    List<Warehouse> findByCity(String city);
    
    List<Warehouse> findByState(String state);
    
    boolean existsByCode(String code);
}
