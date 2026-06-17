package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.model.PackDetail;
import com.pixelbloom.warehouse.service.PackDetailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Pack Detail Controller
 *
 * Base URL: /api/warehouse/pack-details
 *
 * Endpoints:
 *   POST   /api/warehouse/pack-details/{pickListId}          — Packer submits pack details
 *   GET    /api/warehouse/pack-details/{pickListId}          — Get by pick list ID
 *   GET    /api/warehouse/pack-details/order/{orderNumber}   — Get by order number
 *   GET    /api/warehouse/pack-details                       — Get all (admin/manager)
 *   GET    /api/warehouse/pack-details/packer/{packerId}     — Get by packer ID
 */
@RestController
@RequestMapping("/api/warehouse/pack-details")
@RequiredArgsConstructor
@Slf4j
public class PackDetailController {

    private final PackDetailService packDetailService;

    /**
     * POST /api/warehouse/pack-details/{pickListId}
     * Packer submits pack details for a pick list.
     *
     * Body:
     * {
     *   "boxSize":       "M",
     *   "packagingType": "standard",
     *   "weight":        1.2,
     *   "dimensions":    "30x20x15",   // only if boxSize = "custom"
     *   "notes":         "Handle with care",
     *   "packedBy":      "Swara Chavan",
     *   "packedById":    5
     * }
     */
    @PostMapping("/{pickListId}")
    public ResponseEntity<?> savePackDetail(
            @PathVariable Long pickListId,
            @RequestBody Map<String, Object> body) {
        try {
            PackDetail saved = packDetailService.savePackDetail(pickListId, body);
            log.info("✅ Pack details saved for pickListId: {}", pickListId);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            log.error("❌ Failed to save pack details for pickListId {}: {}", pickListId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/warehouse/pack-details/{pickListId}
     * Get pack details for a specific pick list.
     */
    @GetMapping("/{pickListId}")
    public ResponseEntity<?> getByPickListId(@PathVariable Long pickListId) {
        return packDetailService.getByPickListId(pickListId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/warehouse/pack-details/order/{orderNumber}/shipping
     * Called by Shipping Dashboard when order is shipped.
     * Updates carrier, AWB, cost on the pack_details record.
     * Creates a new record if pack details were not filled by packer.
     *
     * Body: { "carrier": "Delhivery", "trackingNumber": "123456789012345678", "shippingCost": 85.0 }
     */
    @PatchMapping("/order/{orderNumber}/shipping")
    public ResponseEntity<?> updateShippingInfo(
            @PathVariable String orderNumber,
            @RequestBody Map<String, Object> body) {
        try {
            PackDetail saved = packDetailService.updateShippingInfo(orderNumber, body);
            log.info("✅ Shipping info saved for order: {}", orderNumber);
            return ResponseEntity.ok(saved);
        } catch (RuntimeException e) {
            log.error("❌ Failed to save shipping info for order {}: {}", orderNumber, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/warehouse/pack-details/order/{orderNumber}
     * Get pack details by order number.
     */
    @GetMapping("/order/{orderNumber}")
    public ResponseEntity<?> getByOrderNumber(@PathVariable String orderNumber) {
        return packDetailService.getByOrderNumber(orderNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/warehouse/pack-details
     * Get all pack details — for admin / warehouse manager dashboard.
     */
    @GetMapping
    public ResponseEntity<List<PackDetail>> getAll() {
        return ResponseEntity.ok(packDetailService.getAll());
    }

    /**
     * GET /api/warehouse/pack-details/packer/{packerId}
     * Get all pack details submitted by a specific packer.
     */
    @GetMapping("/packer/{packerId}")
    public ResponseEntity<List<PackDetail>> getByPackerId(@PathVariable Long packerId) {
        return ResponseEntity.ok(packDetailService.getByPackerId(packerId));
    }
}
