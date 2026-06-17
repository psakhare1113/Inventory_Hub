package com.pixelbloom.warehouse.enums;

/**
 * Cycle Count Status (FR-100)
 */
public enum CycleCountStatus {
    SCHEDULED,      // Cycle count scheduled
    IN_PROGRESS,    // Counting in progress
    COMPLETED,      // Count completed, awaiting approval
    APPROVED,       // Count approved, adjustments made
    REJECTED        // Count rejected, needs recount
}
