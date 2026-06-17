package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.client.AuthClient;
import com.pixelbloom.warehouse.model.PickList;
import com.pixelbloom.warehouse.model.PickListLine;
import com.pixelbloom.warehouse.service.PickListService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Pick List Controller
 *
 * Endpoints used by:
 *   - PickerDashboard.js (frontend)
 *   - orders-service (auto-notify on CONFIRMED)
 *
 * Base URL: /api/warehouse/pick-lists
 * New order notification: POST /api/warehouse/orders/new  (separate path)
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class PickListController {

    private final PickListService pickListService;
    private final AuthClient authClient;

    // ── New Order Notification (called by orders-service on CONFIRMED) ────────

    /**
     * POST /api/warehouse/orders/new
     * Called by orders-service when a new order is CONFIRMED.
     *
     * This endpoint:
     *   1. Creates PickList + PickListLine records (status: PENDING)
     *   2. Broadcasts WebSocket notification to ALL warehouse managers instantly
     *   3. Also notifies admin dashboard
     *
     * Admin ला "Mark Processing" button नाही — order CONFIRMED होताच
     * warehouse manager ला direct notification येते.
     *
     * Body:
     * {
     *   "orderNumber": "ORD-123",
     *   "customerId": 5,
     *   "warehouseId": 1,
     *   "warehouseName": "Pune_WH_01",
     *   "deliveryPincode": "416001",
     *   "deliverySpeed": "STANDARD",
     *   "items": [
     *     { "productId": 1, "productName": "T-Shirt", "barcode": "GRN-XXX-P1-1",
     *       "quantity": 2, "locationCode": "", "locationId": null }
     *   ]
     * }
     */
    @PostMapping("/api/warehouse/orders/new")
    public ResponseEntity<PickList> newOrderReceived(@RequestBody Map<String, Object> body) {
        String orderNumber     = (String) body.get("orderNumber");
        Object customerIdObj   = body.get("customerId");
        Long customerId        = customerIdObj != null ? Long.parseLong(customerIdObj.toString()) : null;
        Object whIdObj         = body.get("warehouseId");
        Long warehouseId       = whIdObj != null ? Long.parseLong(whIdObj.toString()) : null;
        String warehouseName   = (String) body.getOrDefault("warehouseName", "Warehouse");
        String deliveryPincode = (String) body.getOrDefault("deliveryPincode", "");
        String deliverySpeed   = (String) body.getOrDefault("deliverySpeed", "STANDARD");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.getOrDefault("items", List.of());

        log.info("🆕 New order received from orders-service: {} → warehouse: {} ({})", orderNumber, warehouseName, warehouseId);
        PickList pl = pickListService.handleNewOrder(orderNumber, customerId, warehouseId, warehouseName,
                deliveryPincode, deliverySpeed, items);
        return ResponseEntity.ok(pl);
    }

    // ── Pick List Endpoints ───────────────────────────────────────────────────

    /**
     * GET /api/warehouse/pick-lists/status/{status}
     * Used by PickerDashboard to load PENDING / IN_PROGRESS / COMPLETED lists
     */
    @GetMapping("/api/warehouse/pick-lists/status/{status}")
    public ResponseEntity<List<PickList>> getByStatus(@PathVariable String status) {
        log.info("Fetching pick lists with status: {}", status);
        return ResponseEntity.ok(pickListService.getByStatus(status));
    }

    /**
     * POST /api/warehouse/pick-lists/create
     * Legacy endpoint — kept for backward compatibility.
     * Prefer POST /api/warehouse/orders/new for new orders.
     */
    @PostMapping("/api/warehouse/pick-lists/create")
    public ResponseEntity<PickList> createPickList(@RequestBody Map<String, Object> body) {
        String orderNumber = (String) body.get("orderNumber");
        Object customerIdObj = body.get("customerId");
        Long customerId = customerIdObj != null ? Long.parseLong(customerIdObj.toString()) : null;

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) body.getOrDefault("items", List.of());

        log.info("Creating pick list for order: {} with {} items", orderNumber, items.size());
        PickList pl = pickListService.createPickList(orderNumber, customerId, items);
        return ResponseEntity.ok(pl);
    }

    /**
     * PUT /api/warehouse/pick-lists/{id}/start
     * Picker starts working on a pick list → IN_PROGRESS
     */
    @PutMapping("/api/warehouse/pick-lists/{id}/start")
    public ResponseEntity<PickList> startPickList(@PathVariable Long id) {
        log.info("Starting pick list: {}", id);
        return ResponseEntity.ok(pickListService.startPickList(id));
    }

    /**
     * PUT /api/warehouse/pick-lists/{id}/lines/{lineId}/confirm
     * Picker confirms one line (item picked from bin)
     */
    @PutMapping("/api/warehouse/pick-lists/{id}/lines/{lineId}/confirm")
    public ResponseEntity<PickListLine> confirmLine(
            @PathVariable Long id,
            @PathVariable Long lineId) {
        log.info("Confirming pick list line: pickListId={}, lineId={}", id, lineId);
        return ResponseEntity.ok(pickListService.confirmLine(id, lineId));
    }

    /**
     * PUT /api/warehouse/pick-lists/{id}/complete
     * Picker completes pick list → COMPLETED → order advances to PACKED
     */
    @PutMapping("/api/warehouse/pick-lists/{id}/complete")
    public ResponseEntity<PickList> completePickList(@PathVariable Long id) {
        log.info("Completing pick list: {}", id);
        return ResponseEntity.ok(pickListService.completePickList(id));
    }

    /**
     * GET /api/warehouse/pick-lists
     * Get all pick lists (admin view)
     */
    @GetMapping("/api/warehouse/pick-lists")
    public ResponseEntity<List<PickList>> getAllPickLists() {
        return ResponseEntity.ok(pickListService.getByStatus("PENDING"));
    }

    // ── Manager Assignment Endpoints ─────────────────────────────────────────

    /**
     * GET /api/warehouse/pick-lists/unassigned
     * Manager dashboard — PENDING pick lists with no picker assigned yet
     */
    @GetMapping("/api/warehouse/pick-lists/unassigned")
    public ResponseEntity<List<PickList>> getUnassigned() {
        log.info("Fetching unassigned pick lists for manager");
        return ResponseEntity.ok(pickListService.getUnassigned());
    }

    /**
     * GET /api/warehouse/pick-lists/staff/pickers
     * Manager fetches available PICKER staff list from auth-server
     */
    @GetMapping("/api/warehouse/pick-lists/staff/pickers")
    public ResponseEntity<List<Map<String, Object>>> getAvailablePickers(
            @RequestHeader("Authorization") String token) {
        log.info("Fetching available pickers");
        List<Map<String, Object>> pickers = authClient.getStaffByRole(token, "PICKER");
        return ResponseEntity.ok(pickers);
    }

    /**
     * GET /api/warehouse/pick-lists/staff/packers
     * Manager fetches available PACKER staff list from auth-server
     */
    @GetMapping("/api/warehouse/pick-lists/staff/packers")
    public ResponseEntity<List<Map<String, Object>>> getAvailablePackers(
            @RequestHeader("Authorization") String token) {
        log.info("Fetching available packers");
        List<Map<String, Object>> packers = authClient.getStaffByRole(token, "PACKER");
        return ResponseEntity.ok(packers);
    }

    /**
     * GET /api/warehouse/pick-lists/staff/shipping
     * Manager fetches available SHIPPING staff list from auth-server
     */
    @GetMapping("/api/warehouse/pick-lists/staff/shipping")
    public ResponseEntity<List<Map<String, Object>>> getAvailableShipping(
            @RequestHeader("Authorization") String token) {
        log.info("Fetching available shipping staff");
        List<Map<String, Object>> shipping = authClient.getStaffByRole(token, "SHIPPING");
        return ResponseEntity.ok(shipping);
    }

    /**
     * GET /api/warehouse/pick-lists/assigned/shipping/{shippingId}
     */
    @GetMapping("/api/warehouse/pick-lists/assigned/shipping/{shippingId}")
    public ResponseEntity<List<PickList>> getByShippingId(@PathVariable Long shippingId) {
        log.info("Fetching pick lists for shipping staff: {}", shippingId);
        return ResponseEntity.ok(pickListService.getByShippingId(shippingId));
    }

    /**
     * PUT /api/warehouse/pick-lists/{id}/assign
     * Manager assigns Picker + Packer + Shipping staff to a pick list.
     */
    @PutMapping("/api/warehouse/pick-lists/{id}/assign")
    public ResponseEntity<?> assignStaff(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        try {
            Long pickerId        = toLong(body.get("pickerId"));
            String pickerName    = (String) body.get("pickerName");
            String pickerEmail   = (String) body.getOrDefault("pickerEmail", "");
            Long packerId        = toLong(body.get("packerId"));
            String packerName    = (String) body.get("packerName");
            String packerEmail   = (String) body.getOrDefault("packerEmail", "");
            Long shippingId      = toLong(body.get("shippingId"));
            String shippingName  = (String) body.get("shippingName");
            String shippingEmail = (String) body.getOrDefault("shippingEmail", "");

            if (pickerId == null || pickerName == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "pickerId and pickerName are required"));
            }

            PickList updated = pickListService.assignStaff(
                    id,
                    pickerId, pickerName, pickerEmail,
                    packerId, packerName, packerEmail,
                    shippingId, shippingName, shippingEmail);
            log.info("✅ PickList {} assigned — picker: {}, packer: {}, shipping: {}",
                    id, pickerName, packerName, shippingName);
            return ResponseEntity.ok(updated);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PUT /api/warehouse/pick-lists/{id}/unassign
     * Manager removes assignment (to reassign to someone else)
     */
    @PutMapping("/api/warehouse/pick-lists/{id}/unassign")
    public ResponseEntity<?> unassignStaff(@PathVariable Long id) {
        try {
            PickList updated = pickListService.unassignStaff(id);
            log.info("↩️ PickList {} unassigned", id);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/warehouse/pick-lists/assigned/picker/{pickerId}
     */
    @GetMapping("/api/warehouse/pick-lists/assigned/picker/{pickerId}")
    public ResponseEntity<List<PickList>> getByPickerId(@PathVariable Long pickerId) {
        log.info("Fetching pick lists for picker: {}", pickerId);
        return ResponseEntity.ok(pickListService.getByPickerId(pickerId));
    }

    /**
     * GET /api/warehouse/pick-lists/assigned/packer/email/{email}
     */
    @GetMapping("/api/warehouse/pick-lists/assigned/packer/email/{email}")
    public ResponseEntity<List<PickList>> getByPackerEmail(@PathVariable String email) {
        log.info("Fetching COMPLETED pick lists for packer email: {}", email);
        return ResponseEntity.ok(pickListService.getCompletedByPackerEmail(email));
    }

    /**
     * GET /api/warehouse/pick-lists/assigned/picker/email/{email}
     */
    @GetMapping("/api/warehouse/pick-lists/assigned/picker/email/{email}")
    public ResponseEntity<List<PickList>> getByPickerEmail(@PathVariable String email) {
        log.info("Fetching active pick lists for picker email: {}", email);
        return ResponseEntity.ok(pickListService.getActiveByPickerEmail(email));
    }

    /**
     * GET /api/warehouse/pick-lists/assigned/shipping/email/{email}
     */
    @GetMapping("/api/warehouse/pick-lists/assigned/shipping/email/{email}")
    public ResponseEntity<List<PickList>> getByShippingEmail(@PathVariable String email) {
        log.info("Fetching COMPLETED pick lists for shipping email: {}", email);
        return ResponseEntity.ok(pickListService.getCompletedByShippingEmail(email));
    }

    /**
     * GET /api/warehouse/pick-lists/assigned/packer/{packerId}
     */
    @GetMapping("/api/warehouse/pick-lists/assigned/packer/{packerId}")
    public ResponseEntity<List<PickList>> getByPackerId(@PathVariable Long packerId) {
        log.info("Fetching pick lists for packer: {}", packerId);
        return ResponseEntity.ok(pickListService.getByPackerId(packerId));
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }
}
