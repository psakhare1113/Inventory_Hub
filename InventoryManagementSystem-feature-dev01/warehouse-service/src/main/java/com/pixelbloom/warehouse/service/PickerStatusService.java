package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.model.PickerStatus;
import com.pixelbloom.warehouse.model.PickerStatus.StaffOnlineStatus;
import com.pixelbloom.warehouse.repository.PickerStatusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * PickerStatusService
 *
 * Delivery dashboard सारखं — picker/packer/shipping staff ची
 * live online status DB मध्ये track करतो.
 *
 * Flow:
 *   Picker login  → POST /api/warehouse/staff-status/online  → ONLINE
 *   Picker active → POST /api/warehouse/staff-status/heartbeat → lastOnlineAt update
 *   Picker logout → POST /api/warehouse/staff-status/offline → OFFLINE
 *   Pick list start → BUSY
 *   Pick list done  → ONLINE
 *   30 min no heartbeat → auto OFFLINE (scheduled job)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PickerStatusService {

    private final PickerStatusRepository repo;
    private final WarehouseEventPublisher eventPublisher;

    // 30 minutes — same as delivery dashboard
    private static final int STALE_MINUTES = 30;

    // ── Online (login) ────────────────────────────────────────────────────────

    @Transactional
    public PickerStatus goOnline(Long staffId, String staffName, String staffEmail, String role) {
        PickerStatus ps = repo.findByStaffId(staffId).orElse(
                PickerStatus.builder()
                        .staffId(staffId)
                        .staffName(staffName)
                        .staffEmail(staffEmail)
                        .role(role)
                        .build()
        );

        ps.setStaffName(staffName);
        ps.setStaffEmail(staffEmail);
        ps.setRole(role);
        ps.setStatus(StaffOnlineStatus.ONLINE);
        ps.setLastOnlineAt(LocalDateTime.now());
        ps.setUpdatedAt(LocalDateTime.now());

        PickerStatus saved = repo.save(ps);
        log.info("🟢 {} ({}) is ONLINE", staffName, role);

        // 🔔 WebSocket — Manager ला notify करा
        broadcastStatusChange(saved);
        return saved;
    }

    // ── Heartbeat (keep-alive) ────────────────────────────────────────────────

    @Transactional
    public PickerStatus heartbeat(Long staffId) {
        PickerStatus ps = repo.findByStaffId(staffId).orElse(null);
        if (ps == null) return null;

        // OFFLINE असेल तर ONLINE करा (reconnect)
        if (ps.getStatus() == StaffOnlineStatus.OFFLINE) {
            ps.setStatus(StaffOnlineStatus.ONLINE);
            broadcastStatusChange(ps);
        }
        ps.setLastOnlineAt(LocalDateTime.now());
        ps.setUpdatedAt(LocalDateTime.now());
        return repo.save(ps);
    }

    // ── Offline (logout) ──────────────────────────────────────────────────────

    @Transactional
    public PickerStatus goOffline(Long staffId) {
        PickerStatus ps = repo.findByStaffId(staffId).orElse(null);
        if (ps == null) return null;

        ps.setStatus(StaffOnlineStatus.OFFLINE);
        ps.setLastOfflineAt(LocalDateTime.now());
        ps.setUpdatedAt(LocalDateTime.now());

        PickerStatus saved = repo.save(ps);
        log.info("⚫ {} ({}) is OFFLINE", ps.getStaffName(), ps.getRole());

        broadcastStatusChange(saved);
        return saved;
    }

    // ── Busy (pick list started) ──────────────────────────────────────────────

    @Transactional
    public void markBusy(Long staffId) {
        repo.findByStaffId(staffId).ifPresent(ps -> {
            ps.setStatus(StaffOnlineStatus.BUSY);
            ps.setUpdatedAt(LocalDateTime.now());
            PickerStatus saved = repo.save(ps);
            log.info("🟡 {} is BUSY", ps.getStaffName());
            broadcastStatusChange(saved);
        });
    }

    // ── Back to online (pick list completed) ─────────────────────────────────

    @Transactional
    public void markOnlineAfterTask(Long staffId) {
        repo.findByStaffId(staffId).ifPresent(ps -> {
            if (ps.getStatus() == StaffOnlineStatus.BUSY) {
                ps.setStatus(StaffOnlineStatus.ONLINE);
                ps.setLastOnlineAt(LocalDateTime.now());
                ps.setUpdatedAt(LocalDateTime.now());
                PickerStatus saved = repo.save(ps);
                broadcastStatusChange(saved);
            }
        });
    }

    // ── Get all staff statuses ────────────────────────────────────────────────

    public List<PickerStatus> getAllStatuses() {
        return repo.findAll();
    }

    public List<PickerStatus> getByRole(String role) {
        return repo.findByRole(role.toUpperCase());
    }

    public List<PickerStatus> getAllWarehouseStaff() {
        return repo.findByRoleIn(List.of("PICKER", "PACKER", "SHIPPING", "WAREHOUSE_MANAGER"));
    }

    // ── Auto-offline stale sessions (every 5 minutes) ────────────────────────

    @Scheduled(fixedDelay = 5 * 60 * 1000) // every 5 minutes
    @Transactional
    public void autoOfflineStale() {
        LocalDateTime staleThreshold = LocalDateTime.now().minusMinutes(STALE_MINUTES);
        List<PickerStatus> stale = repo.findAll().stream()
                .filter(ps -> ps.getStatus() != StaffOnlineStatus.OFFLINE)
                .filter(ps -> ps.getLastOnlineAt() == null ||
                              ps.getLastOnlineAt().isBefore(staleThreshold))
                .toList();

        stale.forEach(ps -> {
            ps.setStatus(StaffOnlineStatus.OFFLINE);
            ps.setLastOfflineAt(LocalDateTime.now());
            ps.setUpdatedAt(LocalDateTime.now());
            repo.save(ps);
            log.info("⏰ Auto-offline stale session: {} ({})", ps.getStaffName(), ps.getRole());
            broadcastStatusChange(ps);
        });
    }

    // ── WebSocket broadcast ───────────────────────────────────────────────────

    private void broadcastStatusChange(PickerStatus ps) {
        Map<String, Object> data = Map.of(
                "staffId",   ps.getStaffId(),
                "staffName", ps.getStaffName(),
                "role",      ps.getRole(),
                "status",    ps.getStatus().name(),
                "updatedAt", ps.getUpdatedAt() != null ? ps.getUpdatedAt().toString() : ""
        );

        // Manager ला notify करा
        eventPublisher.notifyAllManagers(
                "STAFF_STATUS_CHANGE",
                ps.getStatus() == StaffOnlineStatus.ONLINE ? "🟢 " + ps.getStaffName() + " Online"
                : ps.getStatus() == StaffOnlineStatus.BUSY  ? "🟡 " + ps.getStaffName() + " Busy"
                : "⚫ " + ps.getStaffName() + " Offline",
                ps.getStaffName() + " (" + ps.getRole() + ") is now " + ps.getStatus().name(),
                data
        );

        // Admin ला पण
        eventPublisher.notifyAdmin(
                "STAFF_STATUS_CHANGE",
                ps.getStatus() == StaffOnlineStatus.ONLINE ? "🟢 " + ps.getStaffName() + " Online"
                : ps.getStatus() == StaffOnlineStatus.BUSY  ? "🟡 " + ps.getStaffName() + " Busy"
                : "⚫ " + ps.getStaffName() + " Offline",
                ps.getStaffName() + " (" + ps.getRole() + ") is now " + ps.getStatus().name(),
                data
        );
    }
}
