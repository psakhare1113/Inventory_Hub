package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.dto.WarehouseEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * WarehouseEventPublisher
 *
 * All WebSocket events are broadcast from here.
 *
 * Topics:
 *   /topic/admin/notifications       ← Admin
 *   /topic/warehouse/all             ← Broadcast to all warehouse staff
 *   /topic/warehouse/manager/{id}    ← Specific manager
 *   /topic/warehouse/picker/{id}     ← Specific picker
 *   /topic/warehouse/packer/{id}     ← Specific packer
 *   /topic/warehouse/shipping        ← Shipping staff
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    // ─────────────────────────────────────────────────────────────────────────
    // Notifications for Admin
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Send event to Admin
     * Warehouse → Admin
     */
    public void notifyAdmin(String type, String title, String message, Object data) {
        WarehouseEvent event = WarehouseEvent.of(type, "WAREHOUSE", "ADMIN", title, message, data);
        messagingTemplate.convertAndSend("/topic/admin/notifications", event);
        log.info("📢 [WS→Admin] type={} | {}", type, title);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Notifications for Warehouse Manager
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin → Specific Manager
     */
    public void notifyManager(Long managerId, String type, String title, String message, Object data) {
        WarehouseEvent event = WarehouseEvent.of(type, "ADMIN", "MANAGER_" + managerId, title, message, data);
        messagingTemplate.convertAndSend("/topic/warehouse/manager/" + managerId, event);
        log.info("📢 [WS→Manager#{}] type={} | {}", managerId, type, title);
    }

    /**
     * Broadcast to all managers
     */
    public void notifyAllManagers(String type, String title, String message, Object data) {
        WarehouseEvent event = WarehouseEvent.of(type, "SYSTEM", "ALL_MANAGERS", title, message, data);
        messagingTemplate.convertAndSend("/topic/warehouse/managers", event);
        log.info("📢 [WS→AllManagers] type={} | {}", type, title);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Notifications for Picker
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Manager → Specific Picker (assignment notification)
     */
    public void notifyPicker(Long pickerId, String type, String title, String message, Object data) {
        WarehouseEvent event = WarehouseEvent.of(type, "WAREHOUSE_MANAGER", "PICKER_" + pickerId, title, message, data);
        messagingTemplate.convertAndSend("/topic/warehouse/picker/" + pickerId, event);
        log.info("📢 [WS→Picker#{}] type={} | {}", pickerId, type, title);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Notifications for Packer
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Picker → Specific Packer (order ready to pack)
     */
    public void notifyPacker(Long packerId, String type, String title, String message, Object data) {
        WarehouseEvent event = WarehouseEvent.of(type, "PICKER", "PACKER_" + packerId, title, message, data);
        messagingTemplate.convertAndSend("/topic/warehouse/packer/" + packerId, event);
        log.info("📢 [WS→Packer#{}] type={} | {}", packerId, type, title);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Notifications for Shipping staff
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Packer → Shipping (order packed, ready to ship)
     */
    public void notifyShipping(String type, String title, String message, Object data) {
        WarehouseEvent event = WarehouseEvent.of(type, "PACKER", "SHIPPING", title, message, data);
        messagingTemplate.convertAndSend("/topic/warehouse/shipping", event);
        log.info("📢 [WS→Shipping] type={} | {}", type, title);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Broadcast to all warehouse staff
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Broadcast to all warehouse staff at once
     * (Low stock, system alerts, etc.)
     */
    public void broadcastToWarehouse(String type, String title, String message, Object data) {
        WarehouseEvent event = WarehouseEvent.of(type, "SYSTEM", "ALL_WAREHOUSE", title, message, data);
        messagingTemplate.convertAndSend("/topic/warehouse/all", event);
        log.info("📢 [WS→AllWarehouse] type={} | {}", type, title);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Send to both Admin + Warehouse
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Send to both Admin and all warehouse staff
     */
    public void notifyAll(String type, String title, String message, Object data) {
        notifyAdmin(type, title, message, data);
        broadcastToWarehouse(type, title, message, data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Only for Receiving Clerk — PO Approved / Notify Team
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * WebSocket notification only for Receiving Clerk.
     * Called when PO is Approved or Manager clicks "Notify Receiving".
     * Does NOT go to Manager, Admin, Picker, or Packer.
     */
    public void notifyReceiving(String type, String title, String message, Object data) {
        WarehouseEvent event = WarehouseEvent.of(type, "WAREHOUSE_MANAGER", "RECEIVING", title, message, data);
        messagingTemplate.convertAndSend("/topic/warehouse/receiving", event);
        log.info("📢 [WS→Receiving] type={} | {}", type, title);
    }
}
