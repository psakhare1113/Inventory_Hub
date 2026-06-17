package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.model.WarehouseLocation;
import com.pixelbloom.warehouse.repository.WarehouseLocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * Putaway Location Suggestion Service (FR-32, FR-33)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PutawayService {

    private final WarehouseLocationRepository locationRepository;

    /**
     * Suggest putaway location based on rules (FR-32)
     * Rules:
     * 1. Check preferred locations for product
     * 2. Find locations with available capacity
     * 3. Prioritize locations with lowest current capacity (to balance)
     */
    public Long suggestPutawayLocation(Long warehouseId, Long productId) {
        log.info("Suggesting putaway location for product: {} in warehouse: {}", productId, warehouseId);

        // Rule 1: Check preferred locations
        List<WarehouseLocation> preferredLocations = locationRepository
                .findPreferredLocationsForProduct(warehouseId, productId);

        if (!preferredLocations.isEmpty()) {
            log.info("Found preferred location for product: {}", productId);
            return preferredLocations.get(0).getId();
        }

        // Rule 2: Find available locations with capacity
        List<WarehouseLocation> availableLocations = locationRepository
                .findAvailableLocationsWithCapacity(warehouseId, BigDecimal.ONE);

        if (availableLocations.isEmpty()) {
            log.warn("No available locations found in warehouse: {}", warehouseId);
            return null;
        }

        // Rule 3: Return location with lowest current capacity
        return availableLocations.get(0).getId();
    }

    /**
     * Update location capacity after putaway
     */
    public void updateLocationCapacity(Long locationId, BigDecimal quantity) {
        WarehouseLocation location = locationRepository.findById(locationId)
                .orElseThrow(() -> new RuntimeException("Location not found: " + locationId));

        BigDecimal newCapacity = location.getCurrentCapacity().add(quantity);

        if (newCapacity.compareTo(location.getMaxCapacity()) > 0) {
            throw new RuntimeException("Location capacity exceeded");
        }

        location.setCurrentCapacity(newCapacity);
        locationRepository.save(location);
    }
}
