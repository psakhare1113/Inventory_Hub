package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.dto.WarehouseDto;
import com.pixelbloom.warehouse.enums.LocationType;
import com.pixelbloom.warehouse.model.Warehouse;
import com.pixelbloom.warehouse.model.WarehouseLocation;
import com.pixelbloom.warehouse.repository.WarehouseRepository;
import com.pixelbloom.warehouse.repository.WarehouseLocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final WarehouseLocationRepository warehouseLocationRepository;

    /**
     * Get all warehouses
     */
    public List<WarehouseDto> getAllWarehouses() {
        log.info("Fetching all warehouses");
        return warehouseRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get only active warehouses
     */
    public List<WarehouseDto> getActiveWarehouses() {
        log.info("Fetching active warehouses");
        return warehouseRepository.findByIsActiveTrue().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get warehouse by ID
     */
    public WarehouseDto getWarehouseById(Long id) {
        log.info("Fetching warehouse by id: {}", id);
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + id));
        return toDto(warehouse);
    }

    /**
     * Get warehouse by Code
     */
    public WarehouseDto getWarehouseByCode(String code) {
        log.info("Fetching warehouse by code: {}", code);
        Warehouse warehouse = warehouseRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with code: " + code));
        return toDto(warehouse);
    }

    /**
     * Create a new warehouse + auto-seed default locations
     */
    @Transactional
    public WarehouseDto createWarehouse(WarehouseDto dto) {
        log.info("Creating new warehouse: {}", dto.getName());

        // Check if code already exists
        if (warehouseRepository.existsByCode(dto.getCode())) {
            throw new RuntimeException("Warehouse with code " + dto.getCode() + " already exists");
        }

        Warehouse warehouse = toEntity(dto);
        warehouse.setIsActive(true);
        Warehouse saved = warehouseRepository.save(warehouse);

        // Auto-seed default rack/shelf locations
        seedDefaultLocations(saved);

        log.info("Warehouse created with id: {} and default locations seeded", saved.getId());
        return toDto(saved);
    }

    /**
     * Seed default locations:
     * Zone A: Rack A1 (Shelf A1-01, A1-02), Rack A2 (Shelf A2-01, A2-02)
     * Zone B: Rack B1 (Shelf B1-01, B1-02), Rack B2 (Shelf B2-01, B2-02)
     * + Receiving, Packing, Shipping, Returns areas
     */
    private void seedDefaultLocations(Warehouse wh) {
        String whCode = wh.getCode(); // e.g. WH-KOL-001
        Long whId = wh.getId();
        List<WarehouseLocation> locs = new ArrayList<>();

        // Storage zones: A & B, Racks 1 & 2, Shelves 01 & 02
        String[] zones  = {"A", "B"};
        String[] racks  = {"1", "2"};
        String[] shelves = {"01", "02"};

        for (String zone : zones) {
            for (String rack : racks) {
                for (String shelf : shelves) {
                    // e.g. WH-KOL-001-A-R1-S01
                    String locCode = whCode + "-" + zone + "-R" + rack + "-S" + shelf;
                    locs.add(WarehouseLocation.builder()
                            .warehouseId(whId)
                            .locationCode(locCode)
                            .locationType(LocationType.STORAGE)
                            .area(zone)
                            .aisle(rack)
                            .bay(shelf)
                            .level("L1")
                            .binCode("BIN01")
                            .capacityUom("UNITS")
                            .maxCapacity(BigDecimal.valueOf(100))
                            .currentCapacity(BigDecimal.ZERO)
                            .isActive(true)
                            .isAvailable(true)
                            .build());
                }
            }
        }

        // Functional areas
        locs.add(buildFunctionalLoc(whId, whCode + "-RECV", LocationType.RECEIVING,  "RECV", "Receiving Dock"));
        locs.add(buildFunctionalLoc(whId, whCode + "-PACK", LocationType.PACKING,    "PACK", "Packing Station"));
        locs.add(buildFunctionalLoc(whId, whCode + "-SHIP", LocationType.SHIPPING,   "SHIP", "Shipping Dock"));
        locs.add(buildFunctionalLoc(whId, whCode + "-RETN", LocationType.RETURNS,    "RETN", "Returns Area"));

        warehouseLocationRepository.saveAll(locs);
        log.info("Seeded {} default locations for warehouse {}", locs.size(), whCode);
    }

    private WarehouseLocation buildFunctionalLoc(Long whId, String code, LocationType type,
                                                  String area, String binCode) {
        return WarehouseLocation.builder()
                .warehouseId(whId)
                .locationCode(code)
                .locationType(type)
                .area(area)
                .binCode(binCode)
                .capacityUom("UNITS")
                .maxCapacity(BigDecimal.valueOf(500))
                .currentCapacity(BigDecimal.ZERO)
                .isActive(true)
                .isAvailable(true)
                .build();
    }

    /**
     * Update warehouse
     */
    @Transactional
    public WarehouseDto updateWarehouse(Long id, WarehouseDto dto) {
        log.info("Updating warehouse id: {}", id);
        
        Warehouse existing = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + id));

        // Update fields
        existing.setName(dto.getName());
        existing.setAddress(dto.getAddress());
        existing.setCity(dto.getCity());
        existing.setState(dto.getState());
        existing.setPincode(dto.getPincode());
        existing.setContactPerson(dto.getContactPerson());
        existing.setContactPhone(dto.getContactPhone());
        existing.setContactEmail(dto.getContactEmail());
        existing.setCapacitySqft(dto.getCapacitySqft());
        existing.setIsActive(dto.getIsActive());

        Warehouse updated = warehouseRepository.save(existing);
        log.info("Warehouse updated successfully");
        return toDto(updated);
    }

    /**
     * Deactivate warehouse (soft delete)
     */
    @Transactional
    public void deactivateWarehouse(Long id) {
        log.info("Deactivating warehouse id: {}", id);
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + id));
        warehouse.setIsActive(false);
        warehouseRepository.save(warehouse);
        log.info("Warehouse deactivated successfully");
    }

    /**
     * Permanently delete warehouse (hard delete)
     * Associated locations are also deleted
     */
    @Transactional
    public void deleteWarehousePermanently(Long id) {
        log.info("Permanently deleting warehouse id: {}", id);
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + id));

        // First delete all locations for this warehouse
        List<WarehouseLocation> locations = warehouseLocationRepository.findByWarehouseId(id);
        if (!locations.isEmpty()) {
            warehouseLocationRepository.deleteAll(locations);
            log.info("Deleted {} locations for warehouse id: {}", locations.size(), id);
        }

        // Then delete the warehouse itself
        warehouseRepository.delete(warehouse);
        log.info("Warehouse {} permanently deleted", warehouse.getCode());
    }

    /**
     * Get warehouses by City
     */
    public List<WarehouseDto> getWarehousesByCity(String city) {
        log.info("Fetching warehouses by city: {}", city);
        return warehouseRepository.findByCity(city).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get warehouses by State
     */
    public List<WarehouseDto> getWarehousesByState(String state) {
        log.info("Fetching warehouses by state: {}", state);
        return warehouseRepository.findByState(state).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get all locations for a warehouse
     */
    public List<WarehouseLocation> getWarehouseLocations(Long warehouseId) {
        log.info("Fetching all locations for warehouse id: {}", warehouseId);
        // Verify warehouse exists
        warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + warehouseId));
        return warehouseLocationRepository.findByWarehouseId(warehouseId);
    }

    /**
     * Get active locations for a warehouse
     */
    public List<WarehouseLocation> getActiveWarehouseLocations(Long warehouseId) {
        log.info("Fetching active locations for warehouse id: {}", warehouseId);
        // Verify warehouse exists
        warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + warehouseId));
        return warehouseLocationRepository.findByWarehouseIdAndIsActiveTrue(warehouseId);
    }

    /**
     * Get available locations for a warehouse
     */
    public List<WarehouseLocation> getAvailableWarehouseLocations(Long warehouseId) {
        log.info("Fetching available locations for warehouse id: {}", warehouseId);
        // Verify warehouse exists
        warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("Warehouse not found with id: " + warehouseId));
        return warehouseLocationRepository.findByWarehouseIdAndIsAvailableTrue(warehouseId);
    }

    // ─── Helper Methods ───────────────────────────────────────────────────────

    private WarehouseDto toDto(Warehouse warehouse) {
        WarehouseDto dto = new WarehouseDto();
        dto.setId(warehouse.getId());
        dto.setCode(warehouse.getCode());
        dto.setName(warehouse.getName());
        dto.setAddress(warehouse.getAddress());
        dto.setCity(warehouse.getCity());
        dto.setState(warehouse.getState());
        dto.setPincode(warehouse.getPincode());
        dto.setContactPerson(warehouse.getContactPerson());
        dto.setContactPhone(warehouse.getContactPhone());
        dto.setContactEmail(warehouse.getContactEmail());
        dto.setCapacitySqft(warehouse.getCapacitySqft());
        dto.setIsActive(warehouse.getIsActive());
        dto.setCreatedAt(warehouse.getCreatedAt());
        dto.setUpdatedAt(warehouse.getUpdatedAt());
        return dto;
    }

    private Warehouse toEntity(WarehouseDto dto) {
        Warehouse warehouse = new Warehouse();
        warehouse.setCode(dto.getCode());
        warehouse.setName(dto.getName());
        warehouse.setAddress(dto.getAddress());
        warehouse.setCity(dto.getCity());
        warehouse.setState(dto.getState());
        warehouse.setPincode(dto.getPincode());
        warehouse.setContactPerson(dto.getContactPerson());
        warehouse.setContactPhone(dto.getContactPhone());
        warehouse.setContactEmail(dto.getContactEmail());
        warehouse.setCapacitySqft(dto.getCapacitySqft());
        warehouse.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        return warehouse;
    }
}
