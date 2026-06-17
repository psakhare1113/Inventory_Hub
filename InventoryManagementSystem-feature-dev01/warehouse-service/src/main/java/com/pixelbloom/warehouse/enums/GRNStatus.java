package com.pixelbloom.warehouse.enums;

/**
 * Goods Receipt Note Status (FR-30)
 */
public enum GRNStatus {
    PENDING,        // GRN created, awaiting inspection
    INSPECTED,      // Quality inspection completed
    PUTAWAY,        // Items moved to storage locations
    COMPLETED,      // GRN fully processed
    REJECTED        // GRN rejected due to quality issues
}
