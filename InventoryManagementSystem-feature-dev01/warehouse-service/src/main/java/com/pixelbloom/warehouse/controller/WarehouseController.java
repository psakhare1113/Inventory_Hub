package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.dto.WarehouseDto;
import com.pixelbloom.warehouse.service.WarehouseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Warehouse Management Controller
 * Warehouse Management APIs
 */
@RestController
@RequestMapping("/api/warehouse/warehouses")
@RequiredArgsConstructor
@Slf4j
public class WarehouseController {

    private final WarehouseService warehouseService;

    /**
     * Get all warehouses
     * GET /api/warehouse/warehouses
     */
    @GetMapping
    public ResponseEntity<List<WarehouseDto>> getAllWarehouses() {
        log.info("REST request to get all warehouses");
        List<WarehouseDto> warehouses = warehouseService.getAllWarehouses();
        return ResponseEntity.ok(warehouses);
    }

    /**
     * Get only active warehouses
     * GET /api/warehouse/warehouses/active
     */
    @GetMapping("/active")
    public ResponseEntity<List<WarehouseDto>> getActiveWarehouses() {
        log.info("REST request to get active warehouses");
        List<WarehouseDto> warehouses = warehouseService.getActiveWarehouses();
        return ResponseEntity.ok(warehouses);
    }

    /**
     * Get warehouse by ID
     * GET /api/warehouse/warehouses/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<WarehouseDto> getWarehouseById(@PathVariable Long id) {
        log.info("REST request to get warehouse by id: {}", id);
        WarehouseDto warehouse = warehouseService.getWarehouseById(id);
        return ResponseEntity.ok(warehouse);
    }

    /**
     * Get warehouse by Code
     * GET /api/warehouse/warehouses/code/{code}
     */
    @GetMapping("/code/{code}")
    public ResponseEntity<WarehouseDto> getWarehouseByCode(@PathVariable String code) {
        log.info("REST request to get warehouse by code: {}", code);
        WarehouseDto warehouse = warehouseService.getWarehouseByCode(code);
        return ResponseEntity.ok(warehouse);
    }

    /**
     * Get warehouses by City
     * GET /api/warehouse/warehouses/city/{city}
     */
    @GetMapping("/city/{city}")
    public ResponseEntity<List<WarehouseDto>> getWarehousesByCity(@PathVariable String city) {
        log.info("REST request to get warehouses by city: {}", city);
        List<WarehouseDto> warehouses = warehouseService.getWarehousesByCity(city);
        return ResponseEntity.ok(warehouses);
    }

    /**
     * Get warehouses by State
     * GET /api/warehouse/warehouses/state/{state}
     */
    @GetMapping("/state/{state}")
    public ResponseEntity<List<WarehouseDto>> getWarehousesByState(@PathVariable String state) {
        log.info("REST request to get warehouses by state: {}", state);
        List<WarehouseDto> warehouses = warehouseService.getWarehousesByState(state);
        return ResponseEntity.ok(warehouses);
    }

    /**
     * Create new warehouse
     * POST /api/warehouse/warehouses
     */
    @PostMapping
    public ResponseEntity<WarehouseDto> createWarehouse(@RequestBody WarehouseDto warehouseDto) {
        log.info("REST request to create warehouse: {}", warehouseDto.getName());
        WarehouseDto created = warehouseService.createWarehouse(warehouseDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Update warehouse
     * PUT /api/warehouse/warehouses/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<WarehouseDto> updateWarehouse(
            @PathVariable Long id,
            @RequestBody WarehouseDto warehouseDto) {
        log.info("REST request to update warehouse id: {}", id);
        WarehouseDto updated = warehouseService.updateWarehouse(id, warehouseDto);
        return ResponseEntity.ok(updated);
    }

    /**
     * Deactivate warehouse (soft delete)
     * DELETE /api/warehouse/warehouses/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateWarehouse(@PathVariable Long id) {
        log.info("REST request to deactivate warehouse id: {}", id);
        warehouseService.deactivateWarehouse(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Permanently delete warehouse (hard delete)
     * DELETE /api/warehouse/warehouses/{id}/permanent
     */
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> deleteWarehousePermanently(@PathVariable Long id) {
        log.info("REST request to permanently delete warehouse id: {}", id);
        warehouseService.deleteWarehousePermanently(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get all locations for a warehouse
     * GET /api/warehouse/warehouses/{id}/locations
     */
    @GetMapping("/{id}/locations")
    public ResponseEntity<List<com.pixelbloom.warehouse.model.WarehouseLocation>> getWarehouseLocations(@PathVariable Long id) {
        log.info("REST request to get locations for warehouse id: {}", id);
        List<com.pixelbloom.warehouse.model.WarehouseLocation> locations = warehouseService.getWarehouseLocations(id);
        return ResponseEntity.ok(locations);
    }

    /**
     * Get active locations for a warehouse
     * GET /api/warehouse/warehouses/{id}/locations/active
     */
    @GetMapping("/{id}/locations/active")
    public ResponseEntity<List<com.pixelbloom.warehouse.model.WarehouseLocation>> getActiveWarehouseLocations(@PathVariable Long id) {
        log.info("REST request to get active locations for warehouse id: {}", id);
        List<com.pixelbloom.warehouse.model.WarehouseLocation> locations = warehouseService.getActiveWarehouseLocations(id);
        return ResponseEntity.ok(locations);
    }

    /**
     * Get available locations for a warehouse
     * GET /api/warehouse/warehouses/{id}/locations/available
     */
    @GetMapping("/{id}/locations/available")
    public ResponseEntity<List<com.pixelbloom.warehouse.model.WarehouseLocation>> getAvailableWarehouseLocations(@PathVariable Long id) {
        log.info("REST request to get available locations for warehouse id: {}", id);
        List<com.pixelbloom.warehouse.model.WarehouseLocation> locations = warehouseService.getAvailableWarehouseLocations(id);
        return ResponseEntity.ok(locations);
    }
}
