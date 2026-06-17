package com.pixelbloom.inventory.controller;

import com.pixelbloom.inventory.model.Inventory;
import com.pixelbloom.inventory.model.Warehouse;
import com.pixelbloom.inventory.repository.InventoryRepository;
import com.pixelbloom.inventory.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

/**
 * Warehouse Controller — inventory-service
 *
 * barcode → warehouse lookup:
 *   Before: inventorydb.warehouse table (required manual sync)
 *   Now:    warehouse-service API call → warehouse_db.warehouses (single source of truth)
 *
 * When a new warehouse is added, only add it to warehouse_db —
 * inventory-service automatically fetches data from warehouse-service.
 */
@RestController
@RequestMapping("/api/warehouse")
@RequiredArgsConstructor
@Slf4j
public class WarehouseController {

    private final WarehouseRepository warehouseRepository;
    private final InventoryRepository inventoryRepository;
    private final RestTemplate restTemplate;

    @Value("${warehouse.service.url:http://localhost:8088}")
    private String warehouseServiceUrl;

    // Get all warehouses — inventorydb.warehouse (local, for admin/internal use)
    @GetMapping
    public ResponseEntity<List<Warehouse>> getAllWarehouses() {
        return ResponseEntity.ok(warehouseRepository.findAll());
    }

    // Get active warehouses only
    @GetMapping("/active")
    public ResponseEntity<List<Warehouse>> getActiveWarehouses() {
        return ResponseEntity.ok(warehouseRepository.findByIsActiveTrue());
    }

    // Get warehouse by ID — local table
    @GetMapping("/{id}")
    public ResponseEntity<?> getWarehouseById(@PathVariable Long id) {
        return warehouseRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/warehouse/by-barcode/{barcode}
     *
     * barcode → inventory.warehouse_id → warehouse-service API → warehouse name
     *
     * Flow:
     *   1. inventorydb.inventory → barcode → warehouse_id
     *   2. warehouse-service GET /api/warehouse/{id} → warehouse_db.warehouses
     *   3. Response: { warehouseId, warehouseName, city, isActive }
     *
     * Single source of truth: warehouse_db.warehouses
     * No manual sync needed when a new warehouse is added.
     */
    @GetMapping("/by-barcode/{barcode}")
    public ResponseEntity<?> getWarehouseByBarcode(@PathVariable String barcode) {
        // Step 1: barcode → warehouse_id
        Optional<Inventory> inventoryOpt = inventoryRepository.findByBarcode(barcode);
        if (inventoryOpt.isEmpty()) {
            log.warn("Barcode not found in inventory: {}", barcode);
            return ResponseEntity.notFound().build();
        }

        Long warehouseId = inventoryOpt.get().getWarehouseId();
        if (warehouseId == null) {
            log.warn("warehouse_id is null for barcode: {}", barcode);
            return ResponseEntity.notFound().build();
        }

        // Step 2: warehouse-service API call → warehouse_db.warehouses
        try {
            String url = warehouseServiceUrl + "/api/warehouse/warehouses/" + warehouseId;
            @SuppressWarnings("unchecked")
            Map<String, Object> warehouseData = restTemplate.getForObject(url, Map.class);

            if (warehouseData != null) {
                // warehouse-service Warehouse model: id, code, name, city, state, pincode, isActive
                String warehouseName = warehouseData.get("name") != null
                        ? warehouseData.get("name").toString()
                        : "Warehouse #" + warehouseId;
                String city = warehouseData.get("city") != null
                        ? warehouseData.get("city").toString()
                        : "";
                Boolean isActive = warehouseData.get("isActive") != null
                        ? Boolean.parseBoolean(warehouseData.get("isActive").toString())
                        : true;

                log.info("Warehouse found for barcode {}: id={} name={} city={}", barcode, warehouseId, warehouseName, city);

                Map<String, Object> response = new HashMap<>();
                response.put("warehouseId",   warehouseId);
                response.put("warehouseName", warehouseName);
                response.put("location",      city);
                response.put("isActive",      isActive);
                return ResponseEntity.ok(response);
            }

            // warehouse_id not found in warehouse-service (stale/deleted) — fall back to first active warehouse
            log.warn("warehouse-service returned null for warehouseId: {} (barcode: {}). Falling back to first active warehouse.", warehouseId, barcode);
            return getFallbackActiveWarehouse(barcode, warehouseId);

        } catch (Exception e) {
            // warehouse-service unavailable — fallback to local inventorydb.warehouse table first, then active warehouse
            log.warn("warehouse-service unavailable ({}), falling back to local warehouse table for id={}",
                    e.getMessage(), warehouseId);

            return warehouseRepository.findById(warehouseId)
                    .map(w -> {
                        Map<String, Object> fallback = new HashMap<>();
                        fallback.put("warehouseId",   w.getId());
                        fallback.put("warehouseName", w.getName() != null ? w.getName() : "Warehouse #" + warehouseId);
                        fallback.put("location",      w.getLocation() != null ? w.getLocation() : "");
                        fallback.put("isActive",      w.getIsActive() != null ? w.getIsActive() : true);
                        return ResponseEntity.<Map<String, Object>>ok(fallback);
                    })
                    .orElseGet(() -> getFallbackActiveWarehouse(barcode, warehouseId));
        }
    }

    /**
     * Fallback: fetch the first active warehouse from warehouse-service.
     * Used when the barcode's warehouse_id no longer exists (e.g. warehouse was removed).
     * Since there is only one active warehouse, all orders will correctly route to it.
     */
    @SuppressWarnings("unchecked")
    private ResponseEntity<Map<String, Object>> getFallbackActiveWarehouse(String barcode, Long staleWarehouseId) {
        try {
            String activeUrl = warehouseServiceUrl + "/api/warehouse/warehouses/active";
            List<Map<String, Object>> activeWarehouses = restTemplate.getForObject(activeUrl, List.class);
            if (activeWarehouses != null && !activeWarehouses.isEmpty()) {
                Map<String, Object> first = activeWarehouses.get(0);
                Object id   = first.get("id");
                Object name = first.get("name");
                Object city = first.get("city");
                log.info("Fallback warehouse for barcode {}: id={} name={} (stale warehouseId was {})", barcode, id, name, staleWarehouseId);
                Map<String, Object> result = new HashMap<>();
                result.put("warehouseId",   id != null ? Long.valueOf(id.toString()) : staleWarehouseId);
                result.put("warehouseName", name != null ? name.toString() : "Default Warehouse");
                result.put("location",      city != null ? city.toString() : "");
                result.put("isActive",      true);
                return ResponseEntity.ok(result);
            }
        } catch (Exception ex) {
            log.error("Could not fetch fallback active warehouse: {}", ex.getMessage());
        }
        log.error("No active warehouse found anywhere for barcode: {}", barcode);
        return ResponseEntity.notFound().build();
    }

    // Create warehouse — local inventorydb.warehouse table
    @PostMapping
    public ResponseEntity<Warehouse> createWarehouse(@RequestBody Warehouse warehouse) {
        if (warehouse.getIsActive() == null) warehouse.setIsActive(true);
        return ResponseEntity.ok(warehouseRepository.save(warehouse));
    }

    // Update warehouse — local table
    @PutMapping("/{id}")
    public ResponseEntity<?> updateWarehouse(@PathVariable Long id, @RequestBody Warehouse updated) {
        return warehouseRepository.findById(id).map(w -> {
            w.setName(updated.getName());
            w.setLocation(updated.getLocation());
            if (updated.getIsActive() != null) w.setIsActive(updated.getIsActive());
            return ResponseEntity.ok(warehouseRepository.save(w));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Toggle active status — local table
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<?> toggleWarehouse(@PathVariable Long id) {
        return warehouseRepository.findById(id).map(w -> {
            w.setIsActive(!Boolean.TRUE.equals(w.getIsActive()));
            return ResponseEntity.ok(warehouseRepository.save(w));
        }).orElse(ResponseEntity.notFound().build());
    }
}
