package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.enums.DeliveryBoyStatusEnum;
import com.pixelbloom.orders.model.DeliveryAssignment;
import com.pixelbloom.orders.model.DeliveryBoyStatus;
import com.pixelbloom.orders.repository.DeliveryAssignmentRepository;
import com.pixelbloom.orders.repository.DeliveryBoyStatusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * DeliveryBoyStatusController — Real-time delivery boy status management.
 *
 * Admin endpoints  → /api/auth/admin/delivery-boys/**
 * Delivery Boy     → /api/auth/delivery/status/**
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class DeliveryBoyStatusController {

    private final DeliveryBoyStatusRepository statusRepository;
    private final DeliveryAssignmentRepository assignmentRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN — View all delivery boys with real-time status
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/auth/admin/delivery-boys/status
     * Admin sees all delivery boys with real-time status, zone, and metrics.
     */
    @GetMapping("/api/auth/admin/delivery-boys/status")
    public ResponseEntity<?> getAllDeliveryBoyStatuses() {
        List<DeliveryBoyStatus> all = statusRepository.findAll();
        List<Map<String, Object>> result = all.stream().map(this::toMap).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/auth/admin/delivery-boys/status/summary
     * Admin dashboard summary — counts by status.
     */
    @GetMapping("/api/auth/admin/delivery-boys/status/summary")
    public ResponseEntity<?> getStatusSummary() {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total",     statusRepository.count());
        summary.put("available", statusRepository.countByStatus(DeliveryBoyStatusEnum.AVAILABLE));
        summary.put("busy",      statusRepository.countByStatus(DeliveryBoyStatusEnum.BUSY));
        summary.put("onBreak",   statusRepository.countByStatus(DeliveryBoyStatusEnum.ON_BREAK));
        summary.put("offline",   statusRepository.countByStatus(DeliveryBoyStatusEnum.OFFLINE));

        // Zone-wise breakdown
        List<Object[]> zoneStats = statusRepository.getStatsByZone();
        List<Map<String, Object>> zones = zoneStats.stream().map(row -> {
            Map<String, Object> z = new LinkedHashMap<>();
            z.put("zone",      row[0]);
            z.put("total",     row[1]);
            z.put("available", row[2]);
            z.put("busy",      row[3]);
            z.put("offline",   row[4]);
            return z;
        }).toList();
        summary.put("byZone", zones);

        // Boys with pending cash
        List<DeliveryBoyStatus> cashPending = statusRepository.findBoysWithPendingCash();
        summary.put("boysWithPendingCash", cashPending.size());
        summary.put("totalCashInField", cashPending.stream()
            .map(DeliveryBoyStatus::getCashInHand)
            .reduce(BigDecimal.ZERO, BigDecimal::add));

        return ResponseEntity.ok(summary);
    }

    /**
     * GET /api/auth/admin/delivery-boys/status/available
     * Admin sees only available delivery boys (for manual assignment).
     */
    @GetMapping("/api/auth/admin/delivery-boys/status/available")
    public ResponseEntity<?> getAvailableDeliveryBoys(
            @RequestParam(required = false) String zone) {
        List<DeliveryBoyStatus> boys = zone != null
            ? statusRepository.findBestAvailableInZone(zone)
            : statusRepository.findAllAvailable();
        return ResponseEntity.ok(boys.stream().map(this::toMap).toList());
    }

    /**
     * POST /api/auth/admin/delivery-boys/status/register
     * Admin registers a delivery boy into the status tracking system.
     * Called when admin adds a delivery boy role to a user.
     */
    @PostMapping("/api/auth/admin/delivery-boys/status/register")
    public ResponseEntity<?> registerDeliveryBoy(@RequestBody Map<String, Object> body) {
        try {
            Long deliveryBoyId = Long.valueOf(body.get("deliveryBoyId").toString());
            String name  = (String) body.getOrDefault("name", "");
            String email = (String) body.getOrDefault("email", "");
            String phone = (String) body.getOrDefault("phone", "");
            String zone  = (String) body.getOrDefault("zone", "Zone A");

            // Check if already registered
            Optional<DeliveryBoyStatus> existing = statusRepository.findByDeliveryBoyId(deliveryBoyId);
            if (existing.isPresent()) {
                return ResponseEntity.ok(Map.of(
                    "message", "Already registered",
                    "status", existing.get()
                ));
            }

            DeliveryBoyStatus status = DeliveryBoyStatus.builder()
                .deliveryBoyId(deliveryBoyId)
                .deliveryBoyName(name)
                .deliveryBoyEmail(email)
                .deliveryBoyPhone(phone)
                .assignedZone(zone)
                .status(DeliveryBoyStatusEnum.OFFLINE)
                .currentOrderCount(0)
                .maxOrderCapacity(5)
                .build();

            statusRepository.save(status);
            log.info("Delivery boy registered in status system: {} ({})", name, deliveryBoyId);

            return ResponseEntity.ok(Map.of(
                "message", "Delivery boy registered successfully",
                "deliveryBoyId", deliveryBoyId,
                "zone", zone
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PATCH /api/auth/admin/delivery-boys/status/{deliveryBoyId}/zone
     * Admin changes delivery boy's assigned zone.
     */
    @PatchMapping("/api/auth/admin/delivery-boys/status/{deliveryBoyId}/zone")
    public ResponseEntity<?> updateZone(
            @PathVariable Long deliveryBoyId,
            @RequestParam String zone) {
        return statusRepository.findByDeliveryBoyId(deliveryBoyId)
            .map(s -> {
                String oldZone = s.getAssignedZone();
                s.setAssignedZone(zone);
                statusRepository.save(s);
                log.info("Delivery boy {} zone changed: {} → {}", deliveryBoyId, oldZone, zone);
                return ResponseEntity.ok(Map.of(
                    "deliveryBoyId", deliveryBoyId,
                    "oldZone", oldZone != null ? oldZone : "None",
                    "newZone", zone,
                    "message", "Zone updated successfully"
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/auth/admin/delivery-boys/status/{deliveryBoyId}/capacity
     * Admin updates max order capacity for a delivery boy.
     */
    @PatchMapping("/api/auth/admin/delivery-boys/status/{deliveryBoyId}/capacity")
    public ResponseEntity<?> updateCapacity(
            @PathVariable Long deliveryBoyId,
            @RequestParam int capacity) {
        return statusRepository.findByDeliveryBoyId(deliveryBoyId)
            .map(s -> {
                s.setMaxOrderCapacity(capacity);
                statusRepository.save(s);
                return ResponseEntity.ok(Map.of(
                    "deliveryBoyId", deliveryBoyId,
                    "maxOrderCapacity", capacity,
                    "message", "Capacity updated"
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/auth/admin/delivery-boys/status/{deliveryBoyId}/history
     * Admin sees full delivery history for a specific delivery boy.
     */
    @GetMapping("/api/auth/admin/delivery-boys/status/{deliveryBoyId}/history")
    public ResponseEntity<?> getDeliveryHistory(@PathVariable Long deliveryBoyId) {
        List<DeliveryAssignment> assignments = assignmentRepository.findByDeliveryBoyId(deliveryBoyId);
        Map<String, Object> result = new LinkedHashMap<>();

        // Status profile
        statusRepository.findByDeliveryBoyId(deliveryBoyId).ifPresent(s -> {
            result.put("profile", toMap(s));
        });

        // Assignment history
        result.put("totalAssignments", assignments.size());
        result.put("assignments", assignments);

        // Stats
        long delivered = assignments.stream()
            .filter(a -> a.getDeliveryStatus() != null &&
                a.getDeliveryStatus().name().equals("DELIVERED"))
            .count();
        long failed = assignments.stream()
            .filter(a -> a.getDeliveryStatus() != null &&
                a.getDeliveryStatus().name().equals("FAILED"))
            .count();
        result.put("delivered", delivered);
        result.put("failed", failed);
        result.put("successRate", assignments.isEmpty() ? 100.0 :
            Math.round((delivered * 100.0) / assignments.size() * 10) / 10.0);

        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELIVERY BOY — Update own status
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * PATCH /api/auth/delivery/status/online
     * Delivery boy goes online (AVAILABLE).
     */
    @PatchMapping("/api/auth/delivery/status/online")
    public ResponseEntity<?> goOnline(@RequestParam Long deliveryBoyId) {
        return statusRepository.findByDeliveryBoyId(deliveryBoyId)
            .map(s -> {
                s.setStatus(DeliveryBoyStatusEnum.AVAILABLE);
                s.setLastOnlineAt(LocalDateTime.now());
                statusRepository.save(s);
                log.info("Delivery boy {} is now ONLINE/AVAILABLE", deliveryBoyId);
                return ResponseEntity.ok(Map.of(
                    "deliveryBoyId", deliveryBoyId,
                    "status", "AVAILABLE",
                    "message", "You are now online and ready for deliveries"
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/auth/delivery/status/offline
     * Delivery boy goes offline.
     */
    @PatchMapping("/api/auth/delivery/status/offline")
    public ResponseEntity<?> goOffline(@RequestParam Long deliveryBoyId) {
        return statusRepository.findByDeliveryBoyId(deliveryBoyId)
            .map(s -> {
                s.setStatus(DeliveryBoyStatusEnum.OFFLINE);
                s.setLastOfflineAt(LocalDateTime.now());
                statusRepository.save(s);
                log.info("Delivery boy {} is now OFFLINE", deliveryBoyId);
                return ResponseEntity.ok(Map.of(
                    "deliveryBoyId", deliveryBoyId,
                    "status", "OFFLINE",
                    "message", "You are now offline"
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/auth/delivery/status/break
     * Delivery boy takes a break.
     */
    @PatchMapping("/api/auth/delivery/status/break")
    public ResponseEntity<?> takeBreak(@RequestParam Long deliveryBoyId) {
        return statusRepository.findByDeliveryBoyId(deliveryBoyId)
            .map(s -> {
                s.setStatus(DeliveryBoyStatusEnum.ON_BREAK);
                statusRepository.save(s);
                return ResponseEntity.ok(Map.of(
                    "deliveryBoyId", deliveryBoyId,
                    "status", "ON_BREAK",
                    "message", "Break started"
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/auth/delivery/status/location
     * Delivery boy updates GPS location.
     */
    @PatchMapping("/api/auth/delivery/status/location")
    public ResponseEntity<?> updateLocation(
            @RequestParam Long deliveryBoyId,
            @RequestParam BigDecimal latitude,
            @RequestParam BigDecimal longitude) {
        return statusRepository.findByDeliveryBoyId(deliveryBoyId)
            .map(s -> {
                s.setCurrentLatitude(latitude);
                s.setCurrentLongitude(longitude);
                s.setLastLocationUpdate(LocalDateTime.now());
                statusRepository.save(s);
                return ResponseEntity.ok(Map.of(
                    "deliveryBoyId", deliveryBoyId,
                    "latitude", latitude,
                    "longitude", longitude,
                    "updatedAt", LocalDateTime.now().toString()
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * GET /api/auth/delivery/status/me
     * Delivery boy sees their own status and stats.
     */
    @GetMapping("/api/auth/delivery/status/me")
    public ResponseEntity<?> getMyStatus(@RequestParam Long deliveryBoyId) {
        return statusRepository.findByDeliveryBoyId(deliveryBoyId)
            .map(s -> ResponseEntity.ok(toMap(s)))
            .orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTO-ASSIGN — Find best delivery boy for an order
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/auth/admin/delivery-boys/auto-assign
     * Find the best available delivery boy for a zone.
     * Returns the best candidate without actually assigning.
     */
    @GetMapping("/api/auth/admin/delivery-boys/auto-assign")
    public ResponseEntity<?> findBestDeliveryBoy(
            @RequestParam(required = false) String zone) {
        List<DeliveryBoyStatus> candidates = zone != null
            ? statusRepository.findBestAvailableInZone(zone)
            : statusRepository.findAllAvailable();

        if (candidates.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "available", false,
                "message", "No delivery boys available" + (zone != null ? " in " + zone : ""),
                "suggestion", "Try a different zone or wait for a delivery boy to become available"
            ));
        }

        DeliveryBoyStatus best = candidates.get(0);
        return ResponseEntity.ok(Map.of(
            "available", true,
            "bestCandidate", toMap(best),
            "totalAvailable", candidates.size(),
            "allCandidates", candidates.stream().map(this::toMap).toList()
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, Object> toMap(DeliveryBoyStatus s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                         s.getId());
        m.put("deliveryBoyId",              s.getDeliveryBoyId());
        m.put("deliveryBoyName",            s.getDeliveryBoyName());
        m.put("deliveryBoyEmail",           s.getDeliveryBoyEmail());
        m.put("deliveryBoyPhone",           s.getDeliveryBoyPhone());
        m.put("status",                     s.getStatus());
        m.put("currentOrderCount",          s.getCurrentOrderCount());
        m.put("maxOrderCapacity",           s.getMaxOrderCapacity());
        m.put("assignedZone",               s.getAssignedZone());
        m.put("currentLatitude",            s.getCurrentLatitude());
        m.put("currentLongitude",           s.getCurrentLongitude());
        m.put("lastLocationUpdate",         s.getLastLocationUpdate());
        m.put("totalDeliveriesCompleted",   s.getTotalDeliveriesCompleted());
        m.put("totalDeliveriesFailed",      s.getTotalDeliveriesFailed());
        m.put("successRate",                s.getSuccessRate());
        m.put("averageDeliveryTimeMinutes", s.getAverageDeliveryTimeMinutes());
        m.put("rating",                     s.getRating());
        m.put("cashInHand",                 s.getCashInHand());
        m.put("lastCashDepositAt",          s.getLastCashDepositAt());
        m.put("lastOnlineAt",               s.getLastOnlineAt());
        m.put("canAcceptOrder",             s.canAcceptOrder());
        m.put("updatedAt",                  s.getUpdatedAt());
        return m;
    }
}
