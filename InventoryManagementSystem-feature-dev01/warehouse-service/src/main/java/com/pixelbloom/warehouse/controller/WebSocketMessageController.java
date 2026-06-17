package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.dto.WarehouseEvent;
import com.pixelbloom.warehouse.service.WarehouseEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * WebSocket Message Controller
 *
 * Client → Server messages handle करतो.
 * Frontend STOMP client /app/... ला send करतो → इथे येतो → broadcast होतो.
 *
 * Endpoints:
 *   /app/admin/message       ← Admin → Warehouse Manager ला message
 *   /app/warehouse/message   ← Warehouse Manager → Admin ला message
 *   /app/staff/message       ← Staff (Picker/Packer) → Manager ला message
 *   /app/ping                ← Connection test
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketMessageController {

    private final WarehouseEventPublisher publisher;

    /**
     * Admin → Warehouse Manager ला message पाठवतो
     *
     * Frontend send करतो:
     * stompClient.publish({
     *   destination: '/app/admin/message',
     *   body: JSON.stringify({
     *     managerId: 5,
     *     type: 'ADMIN_MESSAGE',
     *     title: 'Urgent',
     *     message: 'Order #123 priority ship करा',
     *     data: { orderNumber: 'ORD-123' }
     *   })
     * });
     */
    @MessageMapping("/admin/message")
    public void adminToWarehouse(@Payload Map<String, Object> payload) {
        String type    = str(payload.get("type"), "ADMIN_MESSAGE");
        String title   = str(payload.get("title"), "Admin Message");
        String message = str(payload.get("message"), "");
        Object data    = payload.get("data");
        Object managerIdObj = payload.get("managerId");

        log.info("📨 Admin→Warehouse: type={}, title={}", type, title);

        if (managerIdObj != null) {
            // Specific manager ला
            Long managerId = toLong(managerIdObj);
            publisher.notifyManager(managerId, type, title, message, data);
        } else {
            // सगळ्या managers ला
            publisher.notifyAllManagers(type, title, message, data);
        }

        // Admin ला confirmation
        publisher.notifyAdmin("MESSAGE_SENT", "✅ Message Sent",
                "Message sent to warehouse: " + title, data);
    }

    /**
     * Warehouse Manager → Admin ला message पाठवतो
     *
     * Frontend send करतो:
     * stompClient.publish({
     *   destination: '/app/warehouse/message',
     *   body: JSON.stringify({
     *     type: 'WAREHOUSE_MESSAGE',
     *     title: 'Stock Alert',
     *     message: 'Bin A-03 empty आहे, PO approve करा',
     *     data: { binCode: 'A-03' }
     *   })
     * });
     */
    @MessageMapping("/warehouse/message")
    public void warehouseToAdmin(@Payload Map<String, Object> payload) {
        String type    = str(payload.get("type"), "WAREHOUSE_MESSAGE");
        String title   = str(payload.get("title"), "Warehouse Message");
        String message = str(payload.get("message"), "");
        Object data    = payload.get("data");

        log.info("📨 Warehouse→Admin: type={}, title={}", type, title);

        publisher.notifyAdmin(type, title, message, data);
    }

    /**
     * Staff (Picker/Packer/Shipping) → Manager ला message पाठवतो
     *
     * Frontend send करतो:
     * stompClient.publish({
     *   destination: '/app/staff/message',
     *   body: JSON.stringify({
     *     managerId: 5,
     *     staffRole: 'PICKER',
     *     staffName: 'Rahul Patil',
     *     type: 'STAFF_MESSAGE',
     *     title: 'Bin Empty',
     *     message: 'Bin A-03 मध्ये stock नाही',
     *     data: { binCode: 'A-03', pickListId: 12 }
     *   })
     * });
     */
    @MessageMapping("/staff/message")
    public void staffToManager(@Payload Map<String, Object> payload) {
        String type      = str(payload.get("type"), "STAFF_MESSAGE");
        String title     = str(payload.get("title"), "Staff Message");
        String message   = str(payload.get("message"), "");
        String staffRole = str(payload.get("staffRole"), "STAFF");
        String staffName = str(payload.get("staffName"), "Staff");
        Object data      = payload.get("data");
        Object managerIdObj = payload.get("managerId");

        log.info("📨 {}({})→Manager: type={}, title={}", staffRole, staffName, type, title);

        if (managerIdObj != null) {
            Long managerId = toLong(managerIdObj);
            publisher.notifyManager(managerId, type,
                    "📩 " + staffRole + ": " + title,
                    staffName + ": " + message, data);
        } else {
            // Manager ID माहित नाही — सगळ्या managers ला
            publisher.notifyAllManagers(type,
                    "📩 " + staffRole + ": " + title,
                    staffName + ": " + message, data);
        }
    }

    /**
     * Connection test ping
     */
    @MessageMapping("/ping")
    public void ping(@Payload Map<String, Object> payload) {
        log.debug("🏓 WebSocket ping received from: {}", payload.get("from"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String str(Object val, String defaultVal) {
        return val != null ? val.toString() : defaultVal;
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }
}
