package com.pixelbloom.warehouse.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

/**
 * Inventory View Controller
 *
 * Exposes GET /api/warehouse/inventory
 * Proxies the call to inventory-service GET /api/inventory
 * so the Admin dashboard can fetch real-time stock levels
 * from a single warehouse-service endpoint.
 *
 * Flow:
 *   Admin Dashboard → GET /api/warehouse/inventory
 *     → warehouse-service → GET http://inventory-service:9093/api/inventory
 *       → inventoryDB.inventory table
 */
@RestController
@RequestMapping("/api/warehouse")
@Slf4j
public class InventoryViewController {

    private final RestTemplate restTemplate;
    private final String inventoryServiceUrl;

    public InventoryViewController(
            RestTemplate restTemplate,
            @Value("${inventory.service.url:http://localhost:9093}") String inventoryServiceUrl) {
        this.restTemplate = restTemplate;
        this.inventoryServiceUrl = inventoryServiceUrl;
    }

    /**
     * GET /api/warehouse/inventory
     *
     * Returns all inventory items from inventory-service.
     * Each item includes product details, barcode, status, pricing.
     *
     * Used by:
     *   - Admin Dashboard → Inventory tab
     *   - inventoryDataFix.js (frontend utility)
     */
    @GetMapping("/inventory")
    public ResponseEntity<List> getWarehouseInventory() {
        try {
            String url = inventoryServiceUrl + "/api/inventory";
            log.info("Fetching inventory from inventory-service: {}", url);

            List inventory = restTemplate.getForObject(url, List.class);

            if (inventory == null) {
                log.warn("inventory-service returned null for /api/inventory");
                return ResponseEntity.ok(Collections.emptyList());
            }

            log.info("✅ Fetched {} inventory items from inventory-service", inventory.size());
            return ResponseEntity.ok(inventory);

        } catch (Exception e) {
            log.error("❌ Failed to fetch inventory from inventory-service: {}", e.getMessage());
            // Return empty list instead of 500 — frontend handles gracefully
            return ResponseEntity.ok(Collections.emptyList());
        }
    }
}
