package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.model.PickerStatus;
import com.pixelbloom.warehouse.service.PickerStatusService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * PickerStatusController
 *
 * Delivery dashboard सारखं — picker/packer/shipping staff ची live status API
 *
 * Endpoints:
 *   POST /api/warehouse/staff-status/online      ← Login / Dashboard open
 *   POST /api/warehouse/staff-status/heartbeat   ← Keep-alive (every 2 min)
 *   POST /api/warehouse/staff-status/offline     ← Logout
 *   GET  /api/warehouse/staff-status             ← सगळ्यांची status (Manager/Admin)
 *   GET  /api/warehouse/staff-status/role/{role} ← Role ने filter
 */
@RestController
@RequestMapping("/api/warehouse/staff-status")
@RequiredArgsConstructor
@Slf4j
public class PickerStatusController {

    private final PickerStatusService pickerStatusService;

    /**
     * Picker/Packer/Shipping login किंवा dashboard open → ONLINE
     *
     * Body: { staffId, staffName, staffEmail, role }
     */
    @PostMapping("/online")
    public ResponseEntity<PickerStatus> goOnline(@RequestBody Map<String, Object> body) {
        Long staffId     = toLong(body.get("staffId"));
        String staffName  = str(body.get("staffName"), "Staff");
        String staffEmail = str(body.get("staffEmail"), "");
        String role       = str(body.get("role"), "PICKER").toUpperCase();

        if (staffId == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            PickerStatus ps = pickerStatusService.goOnline(staffId, staffName, staffEmail, role);
            log.info("🟢 Staff online: {} ({})", staffName, role);
            return ResponseEntity.ok(ps);
        } catch (Exception e) {
            log.error("❌ goOnline error for staffId={}: {}", staffId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Heartbeat — every 2 minutes frontend ला call करायचं
     * Body: { staffId }
     */
    @PostMapping("/heartbeat")
    public ResponseEntity<PickerStatus> heartbeat(@RequestBody Map<String, Object> body) {
        Long staffId = toLong(body.get("staffId"));
        if (staffId == null) return ResponseEntity.badRequest().build();

        try {
            PickerStatus ps = pickerStatusService.heartbeat(staffId);
            return ps != null ? ResponseEntity.ok(ps) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ heartbeat error for staffId={}: {}", staffId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Logout → OFFLINE
     * Body: { staffId }
     */
    @PostMapping("/offline")
    public ResponseEntity<PickerStatus> goOffline(@RequestBody Map<String, Object> body) {
        Long staffId = toLong(body.get("staffId"));
        if (staffId == null) return ResponseEntity.badRequest().build();

        try {
            PickerStatus ps = pickerStatusService.goOffline(staffId);
            log.info("⚫ Staff offline: staffId={}", staffId);
            return ps != null ? ResponseEntity.ok(ps) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ goOffline error for staffId={}: {}", staffId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * सगळ्या warehouse staff ची live status
     * GET /api/warehouse/staff-status
     */
    @GetMapping
    public ResponseEntity<List<PickerStatus>> getAllStatuses() {
        try {
            return ResponseEntity.ok(pickerStatusService.getAllWarehouseStaff());
        } catch (Exception e) {
            log.error("❌ getAllStatuses error: {}", e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    /**
     * Role ने filter
     * GET /api/warehouse/staff-status/role/PICKER
     */
    @GetMapping("/role/{role}")
    public ResponseEntity<List<PickerStatus>> getByRole(@PathVariable String role) {
        try {
            return ResponseEntity.ok(pickerStatusService.getByRole(role));
        } catch (Exception e) {
            log.error("❌ getByRole({}) error: {}", role, e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }

    private String str(Object val, String def) {
        return val != null ? val.toString() : def;
    }
}
