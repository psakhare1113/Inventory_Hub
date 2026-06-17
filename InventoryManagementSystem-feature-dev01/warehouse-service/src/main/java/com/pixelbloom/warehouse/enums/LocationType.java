package com.pixelbloom.warehouse.enums;

/**
 * Warehouse Location Types (FR-40)
 */
public enum LocationType {
    RECEIVING,      // Receiving dock area
    STORAGE,        // Main storage area
    PICKING,        // Picking zone
    PACKING,        // Packing station
    SHIPPING,       // Shipping dock
    QUARANTINE,     // Quality hold area
    DAMAGED,        // Damaged goods area
    RETURNS         // Returns processing area
}
