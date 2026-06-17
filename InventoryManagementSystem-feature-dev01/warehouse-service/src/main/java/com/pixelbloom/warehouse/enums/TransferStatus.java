package com.pixelbloom.warehouse.enums;

/**
 * Transfer Status (FR-80)
 */
public enum TransferStatus {
    REQUESTED,      // Transfer request created
    APPROVED,       // Transfer approved by manager
    IN_TRANSIT,     // Items picked and in transit
    RECEIVED,       // Items received at destination
    COMPLETED,      // Transfer completed and inventory updated
    CANCELLED,      // Transfer cancelled
    REJECTED        // Transfer request rejected
}
