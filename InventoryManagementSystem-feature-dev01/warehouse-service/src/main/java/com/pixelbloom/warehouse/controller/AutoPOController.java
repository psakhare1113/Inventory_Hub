package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.client.InventoryClient;
import com.pixelbloom.warehouse.model.ProductThreshold;
import com.pixelbloom.warehouse.repository.ProductThresholdRepository;
import com.pixelbloom.warehouse.service.AutoPOService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AutoPO Controller — Product Threshold CRUD + Manual Trigger
 *
 * Endpoints:
 *   GET    /api/warehouse/auto-po/thresholds              → all thresholds
 *   POST   /api/warehouse/auto-po/thresholds              → add new threshold
 *   PUT    /api/warehouse/auto-po/thresholds/{id}         → update threshold
 *   DELETE /api/warehouse/auto-po/thresholds/{id}         → delete threshold
 *   POST   /api/warehouse/auto-po/trigger                 → manual trigger (testing)
 *   GET    /api/warehouse/auto-po/check/{productId}       → check specific product
 *   GET    /api/warehouse/auto-po/stock/{productId}       → view current stock
 */
@RestController
@RequestMapping("/api/warehouse/auto-po")
@RequiredArgsConstructor
@Tag(name = "Auto PO", description = "Automatic Purchase Order — Low Stock Detection")
public class AutoPOController {

    private final ProductThresholdRepository thresholdRepository;
    private final AutoPOService              autoPOService;
    private final InventoryClient            inventoryClient;

    // ── Threshold CRUD ────────────────────────────────────────────────────────

    @GetMapping("/thresholds")
    @Operation(summary = "Get all product thresholds")
    public ResponseEntity<List<ProductThreshold>> getAllThresholds() {
        return ResponseEntity.ok(thresholdRepository.findAll());
    }

    @GetMapping("/thresholds/warehouse/{warehouseId}")
    @Operation(summary = "Get thresholds for a specific warehouse")
    public ResponseEntity<List<ProductThreshold>> getThresholdsByWarehouse(
            @PathVariable Long warehouseId) {
        return ResponseEntity.ok(thresholdRepository.findByWarehouseId(warehouseId));
    }

    @PostMapping("/thresholds")
    @Operation(summary = "Add product threshold",
               description = "Configure auto PO for a product. When stock < lowStockThreshold, system creates DRAFT PO.")
    public ResponseEntity<?> addThreshold(@RequestBody ProductThreshold threshold) {
        // Duplicate check
        if (thresholdRepository.findByProductIdAndWarehouseId(
                threshold.getProductId(), threshold.getWarehouseId()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Threshold already exists for product " + threshold.getProductId()
                       + " in warehouse " + threshold.getWarehouseId()
                       + ". Use PUT to update."
            ));
        }
        ProductThreshold saved = thresholdRepository.save(threshold);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/thresholds/{id}")
    @Operation(summary = "Update product threshold")
    public ResponseEntity<?> updateThreshold(
            @PathVariable Long id,
            @RequestBody ProductThreshold updated) {
        return thresholdRepository.findById(id).map(existing -> {
            existing.setLowStockThreshold(updated.getLowStockThreshold());
            existing.setReorderQty(updated.getReorderQty());
            existing.setDefaultSupplierId(updated.getDefaultSupplierId());
            existing.setAutoPOEnabled(updated.getAutoPOEnabled());
            existing.setUnitPrice(updated.getUnitPrice());
            existing.setProductName(updated.getProductName());
            return ResponseEntity.ok(thresholdRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/thresholds/{id}")
    @Operation(summary = "Delete product threshold")
    public ResponseEntity<Void> deleteThreshold(@PathVariable Long id) {
        thresholdRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/thresholds/{id}/toggle")
    @Operation(summary = "Enable/Disable auto PO for a product")
    public ResponseEntity<?> toggleThreshold(@PathVariable Long id) {
        return thresholdRepository.findById(id).map(t -> {
            t.setAutoPOEnabled(!t.getAutoPOEnabled());
            thresholdRepository.save(t);
            return ResponseEntity.ok(Map.of(
                "productId",     t.getProductId(),
                "autoPOEnabled", t.getAutoPOEnabled(),
                "message",       t.getAutoPOEnabled()
                                    ? "✅ Auto PO enabled for product " + t.getProductId()
                                    : "⏸️ Auto PO disabled for product " + t.getProductId()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Manual Trigger ────────────────────────────────────────────────────────

    @PostMapping("/trigger")
    @Operation(summary = "Manually trigger auto PO check",
               description = "Useful for testing. Runs the same logic as the scheduled job.")
    public ResponseEntity<Map<String, String>> manualTrigger() {
        String result = autoPOService.manualTrigger();
        return ResponseEntity.ok(Map.of("message", result));
    }

    @GetMapping("/check/{productId}")
    @Operation(summary = "Check specific product stock vs threshold")
    public ResponseEntity<Map<String, Object>> checkProduct(
            @PathVariable Long productId,
            @RequestParam(defaultValue = "1") Long warehouseId) {
        try {
            long currentStock = inventoryClient.getAvailableStock(productId);
            var thresholdOpt  = thresholdRepository.findByProductIdAndWarehouseId(productId, warehouseId);

            if (thresholdOpt.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "productId",    productId,
                    "currentStock", currentStock,
                    "message",      "No threshold configured for this product"
                ));
            }

            ProductThreshold t = thresholdOpt.get();
            boolean needsPO    = currentStock < t.getLowStockThreshold();

            return ResponseEntity.ok(Map.of(
                "productId",         productId,
                "productName",       t.getProductName() != null ? t.getProductName() : "Product #" + productId,
                "currentStock",      currentStock,
                "lowStockThreshold", t.getLowStockThreshold(),
                "reorderQty",        t.getReorderQty(),
                "autoPOEnabled",     t.getAutoPOEnabled(),
                "needsReorder",      needsPO,
                "stockStatus",       currentStock == 0 ? "OUT_OF_STOCK"
                                   : needsPO           ? "LOW_STOCK"
                                   :                     "SUFFICIENT",
                "message",           needsPO
                                   ? "🚨 Stock LOW! Auto PO will be created."
                                   : "✅ Stock sufficient. No PO needed."
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/stock/{productId}")
    @Operation(summary = "Get current available stock for a product")
    public ResponseEntity<Map<String, Object>> getCurrentStock(@PathVariable Long productId) {
        long stock = inventoryClient.getAvailableStock(productId);
        return ResponseEntity.ok(Map.of(
            "productId",    productId,
            "currentStock", stock,
            "available",    stock > 0,
            "stockLevel",   stock == 0 ? "OUT_OF_STOCK" : stock < 50 ? "LOW" : "SUFFICIENT"
        ));
    }
}
