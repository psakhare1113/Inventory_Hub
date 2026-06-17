package com.pixelbloom.warehouse.enums;

/**
 * Purchase Order Status Lifecycle (FR-22)
 */
public enum POStatus {
    DRAFT,          // PO created but not finalized
    APPROVED,       // PO approved and sent to supplier
    RECEIVING,      // Partial or full receiving in progress
    CLOSED,         // All items received and PO completed
    CANCELLED       // PO cancelled before completion
}
