package com.pixelbloom.warehouse.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * WebSocket event payload — सगळ्या notifications साठी common structure
 *
 * type:    event type (ORDER_PICKED, ORDER_PACKED, PO_APPROVED, etc.)
 * source:  कोणी पाठवलं (ADMIN, WAREHOUSE_MANAGER, PICKER, PACKER, SYSTEM)
 * target:  कोणाला पाठवलं (ADMIN, PICKER_123, PACKER_456, ALL)
 * title:   notification title
 * message: notification message
 * data:    extra payload (order number, pick list id, etc.)
 * time:    timestamp
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseEvent {

    private String type;
    private String source;
    private String target;
    private String title;
    private String message;
    private Object data;
    private Instant time;

    // ── Quick factory methods ─────────────────────────────────────────────────

    public static WarehouseEvent of(String type, String source, String target,
                                     String title, String message, Object data) {
        return WarehouseEvent.builder()
                .type(type)
                .source(source)
                .target(target)
                .title(title)
                .message(message)
                .data(data)
                .time(Instant.now())
                .build();
    }

    public static WarehouseEvent system(String type, String title, String message, Object data) {
        return of(type, "SYSTEM", "ALL", title, message, data);
    }
}
