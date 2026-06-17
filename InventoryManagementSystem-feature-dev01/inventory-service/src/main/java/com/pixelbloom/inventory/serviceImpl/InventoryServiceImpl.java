package com.pixelbloom.inventory.serviceImpl;

import com.pixelbloom.inventory.enums.*;
import com.pixelbloom.inventory.exception.DuplicateResourceException;
import com.pixelbloom.inventory.exception.InsufficientInventoryException;
import com.pixelbloom.inventory.exception.ResourceNotFoundException;
import com.pixelbloom.inventory.model.*;
import com.pixelbloom.inventory.repository.InventoryReservationRepository;
import com.pixelbloom.inventory.repository.InventoryStatusHistoryRepository;
import com.pixelbloom.inventory.repository.InventoryTransactionRepository;
import com.pixelbloom.inventory.requestEntity.AdminInventoryUpdateRequest;
import com.pixelbloom.inventory.requestEntity.PriceUpdateRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.pixelbloom.inventory.repository.InventoryRepository;
import com.pixelbloom.inventory.service.InventoryService;
import com.pixelbloom.inventory.service.ProductIntegrationService;
import lombok.extern.slf4j.Slf4j;

import java.sql.Date;
import java.math.BigDecimal;
import java.sql.SQLIntegrityConstraintViolationException;
import java.time.LocalDate;
import java.time.LocalDateTime;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryReservationRepository reservationRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final ProductIntegrationService productIntegrationService;
    private final InventoryStatusHistoryRepository statusHistoryRepository;

    public InventoryServiceImpl(InventoryRepository inventoryRepository,
                                InventoryReservationRepository reservationRepository,
                                InventoryTransactionRepository transactionRepository,
                                ProductIntegrationService productIntegrationService,
                                InventoryStatusHistoryRepository statusHistoryRepository) {
        this.inventoryRepository = inventoryRepository;
        this.reservationRepository = reservationRepository;
        this.transactionRepository = transactionRepository;
        this.productIntegrationService = productIntegrationService;
        this.statusHistoryRepository = statusHistoryRepository;
    }

    // ===================== HELPER: Save Status History =====================
    private void saveStatusHistory(Inventory inventory, String previousStatus, String newStatus, String remarks, Long changedBy) {
        InventoryStatusHistory history = InventoryStatusHistory.builder()
                .inventory(inventory)
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .remarks(remarks)
                .changedAt(LocalDateTime.now())
                .changedBy(changedBy)
                .build();
        statusHistoryRepository.save(history);
    }

    // ===================== ADMIN APIs =====================

    @Override
    public List<InventoryWithProductDetails> getAllInventoryWithProductDetails() {
        List<Inventory> inventories = inventoryRepository.findAll();
        List<InventoryWithProductDetails> result = new ArrayList<>();
        
        for (Inventory inventory : inventories) {
            // Fetch product details
            Map<String, Object> productDetails = productIntegrationService.getProductDetails(inventory.getProductId());
            Map<String, Object> categoryDetails = productIntegrationService.getCategoryDetails(inventory.getCategoryId());
            Map<String, Object> subcategoryDetails = productIntegrationService.getSubcategoryDetails(inventory.getSubcategoryId());
            Map<String, Object> pricingDetails = productIntegrationService.getPricingDetails(inventory.getProductId());
            
            InventoryWithProductDetails details = InventoryWithProductDetails.builder()
                    .id(inventory.getId())
                    .barcode(inventory.getBarcode())
                    .productId(inventory.getProductId())
                    .categoryId(inventory.getCategoryId())
                    .subcategoryId(inventory.getSubcategoryId())
                    .warehouseId(inventory.getWarehouseId())
                    .inventoryStatus(inventory.getInventoryStatus())
                    .platformStatus(inventory.getPlatformStatus())
                    .conditionStatus(inventory.getConditionStatus())
                    .mrp(inventory.getMrp())
                    .showroomPrice(inventory.getShowroomPrice())
                    .buyPrice(inventory.getBuyPrice())
                    .sellingPrice(inventory.getSellingPrice())
                    .stockSource(inventory.getStockSource())
                    .isCustomerReturned(inventory.getIsCustomerReturned())
                    .isWarehouseDamaged(inventory.getIsWarehouseDamaged())
                    .createdAt(inventory.getCreatedAt())
                    .updatedAt(inventory.getUpdatedAt())
                    .createdBy(inventory.getCreatedBy())
                    .updatedBy(inventory.getUpdatedBy())
                    // Product details from products service
                    .productName(productDetails != null ? (String) productDetails.get("name") : "Unknown Product")
                    .productDescription(productDetails != null ? (String) productDetails.get("description") : null)
                    .productBarcode(productDetails != null ? (String) productDetails.get("productBarcode") : null)
                    .productUrl(productDetails != null ? (String) productDetails.get("productUrl") : null)
                    .productStatus(productDetails != null ? (String) productDetails.get("status") : null)
                    .eligibleForReturn(productDetails != null ? (Boolean) productDetails.getOrDefault("eligibleForReturn", false) : false)
                    // Category and subcategory names
                    .categoryName(categoryDetails != null ? (String) categoryDetails.get("name") : "Unknown Category")
                    .subcategoryName(subcategoryDetails != null ? (String) subcategoryDetails.get("name") : "Unknown Subcategory")
                    // Pricing details from pricing service
                    .productMrp(pricingDetails != null ? convertToBigDecimal(pricingDetails.get("mrp")) : null)
                    .productSellingPrice(pricingDetails != null ? convertToBigDecimal(pricingDetails.get("sellingPrice")) : null)
                    .unitSize(pricingDetails != null ? convertToDouble(pricingDetails.get("unitSize")) : null)
                    .unitLabel(pricingDetails != null ? (String) pricingDetails.get("unitLabel") : null)
                    .build();
            
            result.add(details);
        }
        
        return result;
    }

    public Inventory addInventory(Inventory inventory) {
        try {
            // Validate product exists — log warning but don't block warehouse GRN flow
            boolean productValid = productIntegrationService.validateProduct(inventory.getProductId());
            if (!productValid) {
                log.warn("Product ID {} could not be validated (products-service may be down or product inactive). Proceeding with inventory insert for warehouse GRN flow.", inventory.getProductId());
            }
            
            // Check if barcode already exists
            if (inventoryRepository.existsByBarcode(inventory.getBarcode())) {
                throw new DuplicateResourceException("Inventory with barcode '" + inventory.getBarcode() + "' already exists");
            }
            
            // Set default values for nullable fields from warehouse GRN flow
            if (inventory.getCategoryId() == null)    inventory.setCategoryId(0L);
            if (inventory.getSubcategoryId() == null) inventory.setSubcategoryId(0L);
            if (inventory.getMrp() == null)           inventory.setMrp(java.math.BigDecimal.ZERO);
            if (inventory.getShowroomPrice() == null) inventory.setShowroomPrice(java.math.BigDecimal.ZERO);
            if (inventory.getBuyPrice() == null)      inventory.setBuyPrice(java.math.BigDecimal.ZERO);
            if (inventory.getSellingPrice() == null)  inventory.setSellingPrice(java.math.BigDecimal.ZERO);
            if (inventory.getStockSource() == null)   inventory.setStockSource("SUPPLIER");

            // Set status defaults
            inventory.setInventoryStatus(InventoryStatus.AVAILABLE);
            inventory.setPlatformStatus(PlatformStatus.ENABLED);
            if (inventory.getConditionStatus() == null) inventory.setConditionStatus(ConditionStatus.GOOD);
            inventory.setIsCustomerReturned(inventory.getIsCustomerReturned() != null ? inventory.getIsCustomerReturned() : false);
            inventory.setIsWarehouseDamaged(inventory.getIsWarehouseDamaged() != null ? inventory.getIsWarehouseDamaged() : false);
            
            Inventory saved = inventoryRepository.save(inventory);

            // Save initial status history on create
            saveStatusHistory(saved, null, InventoryStatus.AVAILABLE.name(),
                    "Inventory created via GRN putaway", saved.getCreatedBy());

            // 🚀 AUTO-SYNC: Sync inventory to pricing table
            if (saved.getBuyPrice() != null && saved.getBuyPrice().compareTo(BigDecimal.ZERO) > 0) {
                log.info("🔄 Triggering auto-sync to pricing for productId: {} with buyPrice: {}", 
                    saved.getProductId(), saved.getBuyPrice());
                productIntegrationService.syncInventoryToPricing(saved.getProductId(), saved.getBuyPrice());
            } else {
                log.info("⚠️ Skipping pricing sync - buyPrice is null or zero for productId: {}", saved.getProductId());
            }

            return saved;
        } catch (DataIntegrityViolationException ex) {
            if (ex.getCause() instanceof SQLIntegrityConstraintViolationException) {
                throw new DuplicateResourceException("Inventory with this barcode already exists");
            }
            throw ex;
        }
    }


    @Override
    @Transactional
    public Inventory updatePrice(String barcode, PriceUpdateRequest request) {
        Inventory inventory = inventoryRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));

        // if (request.getSellingPrice().compareTo(request.getMrp()) > 0)
        //    throw new IllegalArgumentException("Selling price cannot exceed MRP");

        //   if (request.getSellingPrice().compareTo(request.getShowroomPrice()) < 0)
        //     throw new IllegalArgumentException("Selling price cannot be less than showroom price");

        inventory.setMrp(request.getMrp());
        inventory.setShowroomPrice(request.getShowroomPrice());
        inventory.setBuyPrice(request.getBuyPrice());
        inventory.setSellingPrice(request.getSellingPrice());
        inventory.setUpdatedBy(request.getUpdatedBy());
        //   inventory.setTransactionDate(LocalDateTime.now());

        return inventoryRepository.save(inventory);
    }

    @Override
    @Transactional
    public void disableInventory(String barcode, Long adminId) {
        Inventory inventory = inventoryRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));
        if (inventory.getInventoryStatus() == InventoryStatus.SALE)
            throw new IllegalStateException("Cannot disable sold inventory");

        String previousStatus = inventory.getInventoryStatus().name();

        inventory.setPlatformStatus(PlatformStatus.DISABLED);
        inventory.setInventoryStatus(InventoryStatus.REMOVED);
        inventory.setUpdatedBy(adminId);
        inventoryRepository.save(inventory);

        saveStatusHistory(inventory, previousStatus, InventoryStatus.REMOVED.name(),
                "Inventory disabled by admin", adminId);
    }

    @Override
    @Transactional
    public void enableInventory(String barcode, Long adminId) {
        Inventory inventory = inventoryRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));

        String previousStatus = inventory.getInventoryStatus().name();

        inventory.setPlatformStatus(PlatformStatus.ENABLED);
        inventory.setInventoryStatus(InventoryStatus.AVAILABLE);
        inventory.setUpdatedBy(adminId);
        inventoryRepository.save(inventory);

        saveStatusHistory(inventory, previousStatus, InventoryStatus.AVAILABLE.name(),
                "Inventory enabled by admin", adminId);
    }

    @Override
    @Transactional
    public Inventory updateInventoryStatus(String barcode, AdminInventoryUpdateRequest request) {
        Inventory inventory = inventoryRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));

        String previousStatus = inventory.getInventoryStatus().name();

        if (request.getInventoryStatus() != null)
            inventory.setInventoryStatus(InventoryStatus.from(request.getInventoryStatus()));

        if (request.getPlatformStatus() != null)
            inventory.setPlatformStatus(PlatformStatus.from(request.getPlatformStatus()));

        if (request.getConditionStatus() != null)
            inventory.setConditionStatus(ConditionStatus.from(request.getConditionStatus()));

        if (request.getIsCustomerReturned() != null)
            inventory.setIsCustomerReturned(request.getIsCustomerReturned());

        if (request.getIsWarehouseDamaged() != null)
            inventory.setIsWarehouseDamaged(request.getIsWarehouseDamaged());

        inventory.setUpdatedBy(request.getUpdatedBy());
        Inventory updated = inventoryRepository.save(inventory);

        saveStatusHistory(updated, previousStatus, updated.getInventoryStatus().name(),
                "Admin manual status update", request.getUpdatedBy());

        return updated;
    }

    // ===================== PRICING INTEGRATION =====================
    @Override
    public Map<String, Object> getProductPricing(Long productId) {
        return productIntegrationService.getPricingDetails(productId);
    }

    // ===================== ORDER ORCHESTRATION =====================
   /* @Override
    @Transactional
    public ReserveItemResponse releaseInventoryForOrder(InventoryReleaseRequest request) {

        List<InventoryReservedItemDto> releasedItems = new ArrayList<>();

        for (String barcode : request.getBarcodes()) {
            InventoryReservation reservation = reservationRepository.findByOrderNumberAndBarcode(
                    request.getOrderNumber(), barcode).orElseThrow(() -> new ResourceNotFoundException(
                                    "No reservation found for barcode=" + barcode));

            Inventory inventory = inventoryRepository.findById(reservation.getInventoryId())
            .orElseThrow(() ->new ResourceNotFoundException("Inventory not found for id=" + reservation.getInventoryId()));

            // 1️⃣ Restore inventory
            inventory.setInventoryStatus(InventoryStatus.AVAILABLE);
            inventoryRepository.save(inventory);

            reservationRepository.delete(reservation);

            // 2️⃣ Build response
            releasedItems.add(
                    InventoryReservedItemDto.builder()
                            .barcode(inventory.getBarcode())
                            .productId(inventory.getProductId())
                            .categoryId(inventory.getCategoryId())
                            .subcategoryId(inventory.getSubcategoryId())
                            .inventoryStatus(inventory.getInventoryStatus())
                            .quantity(1)
                            .build()
            );

            // 3️⃣ Remove reservation
            reservationRepository.delete(reservation);
        }

        return ReserveItemResponse.builder()
                .orderNumber(request.getOrderNumber())
                .items(releasedItems)
                .build();
    }
*/


    @Override
    @Transactional
    public ReserveItemResponse releaseInventoryForOrder(InventoryReleaseRequest request) {
        List<InventoryReservedItemDto> releasedItems = new ArrayList<>();

        for (String barcode : request.getBarcodes()) {
            // Case 1: Check if barcode is RESERVED
            InventoryReservation reservation = reservationRepository.findByOrderNumberAndBarcode(
                    request.getOrderNumber(), barcode).orElse(null);

            if (reservation != null) {
                // Handle RESERVED inventory
                Inventory inventory = inventoryRepository.findById(reservation.getInventoryId())
                        .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for id=" + reservation.getInventoryId()));

                // Make inventory AVAILABLE
                inventory.setInventoryStatus(InventoryStatus.AVAILABLE);
                inventoryRepository.save(inventory);

                // Delete reservation
                reservationRepository.delete(reservation);

                releasedItems.add(buildReleasedItem(inventory));

                saveStatusHistory(inventory, InventoryStatus.RESERVED.name(), InventoryStatus.AVAILABLE.name(),
                        "Reservation released for order: " + request.getOrderNumber(), null);
            } else {
                // Case 2: Check if barcode is SALE (in transaction repo)
                Inventory inventory = inventoryRepository.findByBarcode(barcode)
                        .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for barcode=" + barcode));

                if (inventory.getInventoryStatus() == InventoryStatus.SALE) {
                    // Find and delete transaction entries for this order and barcode
                    List<InventoryTransaction> transactions = transactionRepository.findByOrderIdAndInventoryId(
                            request.getOrderNumber(), inventory.getId());

                    if (!transactions.isEmpty()) {
                        // Delete transaction entries
                        transactionRepository.deleteAll(transactions);

                        // Make inventory AVAILABLE
                        inventory.setInventoryStatus(InventoryStatus.AVAILABLE);
                        inventoryRepository.save(inventory);

                        releasedItems.add(buildReleasedItem(inventory));

                        saveStatusHistory(inventory, InventoryStatus.SALE.name(), InventoryStatus.AVAILABLE.name(),
                                "Sale reversed for order: " + request.getOrderNumber(), null);
                    }
                }
            }
        }

        return ReserveItemResponse.builder().orderNumber(request.getOrderNumber()).items(releasedItems).build();
    }

    private InventoryReservedItemDto buildReleasedItem(Inventory inventory) {
        return InventoryReservedItemDto.builder().barcode(inventory.getBarcode()).productId(inventory.getProductId())
                .categoryId(inventory.getCategoryId()).subcategoryId(inventory.getSubcategoryId()).inventoryStatus(inventory.getInventoryStatus())
                .quantity(1).build();
    }


    @Transactional
    public void confirmOrder(String orderNumber) {

        List<InventoryReservation> reservations = reservationRepository.findByOrderNumber(orderNumber);
        for (InventoryReservation r : reservations) {
            Inventory inventory = inventoryRepository.findById(r.getInventoryId()).orElseThrow();

            // 1️ Update inventory state
            inventory.setInventoryStatus(InventoryStatus.SALE);
            inventoryRepository.save(inventory);

            // 2️ Insert SALE transaction
            InventoryTransaction tx = InventoryTransaction.sale(inventory, r.getOrderNumber(), r.getQuantity());
            transactionRepository.save(tx);

            // 3️ Delete reservation after sale
            reservationRepository.delete(r);

            // 4️ Save status history
            saveStatusHistory(inventory, InventoryStatus.RESERVED.name(), InventoryStatus.SALE.name(),
                    "Order confirmed: " + orderNumber, null);
        }
    }

    @Override
    @Transactional
    public ReserveItemResponse reserveInventoryForOrder(InventoryReserveRequest request) {

        List<InventoryReservedItemDto> reservedItems = new ArrayList<>();
        List<String> insufficientItems = new ArrayList<>();

        // ── Step 0: Auto-cleanup stale/expired reservations for this orderNumber ──
        // This handles cases where a previous attempt failed mid-way and left
        // orphaned reservation records (causing 409 Duplicate barcode on retry).
        List<InventoryReservation> existingReservations =
                reservationRepository.findByOrderNumber(request.getOrderNumber());
        if (!existingReservations.isEmpty()) {
            log.warn("Found {} stale reservations for orderNumber={}. Cleaning up before re-reserving.",
                    existingReservations.size(), request.getOrderNumber());
            for (InventoryReservation stale : existingReservations) {
                // Restore inventory to AVAILABLE
                inventoryRepository.findById(stale.getInventoryId()).ifPresent(inv -> {
                    if (inv.getInventoryStatus() == InventoryStatus.RESERVED) {
                        inv.setInventoryStatus(InventoryStatus.AVAILABLE);
                        inventoryRepository.save(inv);
                        log.info("Restored barcode={} to AVAILABLE (stale cleanup)", inv.getBarcode());
                    }
                });
            }
            reservationRepository.deleteAll(existingReservations);
            log.info("Stale reservations cleaned for orderNumber={}", request.getOrderNumber());
        }

        // ── Step 1: Check availability for all items ──────────────────────────
        for (ReserveItem item : request.getItems()) {
            log.info("Checking availability: productId={}, qty={}", item.getProductId(), item.getQuantity());
            List<Inventory> availableUnits = findAvailableUnits(item, item.getQuantity());
            if (availableUnits.size() < item.getQuantity()) {
                insufficientItems.add("productId=" + item.getProductId()
                        + " (requested=" + item.getQuantity()
                        + ", available=" + availableUnits.size() + ")");
            }
        }

        if (!insufficientItems.isEmpty()) {
            throw new InsufficientInventoryException("Insufficient stock: " + String.join(", ", insufficientItems));
        }

        // ── Step 2: Reserve all items ─────────────────────────────────────────
        for (ReserveItem item : request.getItems()) {
            List<Inventory> availableUnits = findAvailableUnits(item, item.getQuantity());

            availableUnits.stream().limit(item.getQuantity()).forEach(inv -> {
                inv.setInventoryStatus(InventoryStatus.RESERVED);
                inventoryRepository.save(inv);

                reservationRepository.save(InventoryReservation.builder()
                        .orderNumber(request.getOrderNumber())
                        .inventoryId(inv.getId())
                        .productId(inv.getProductId())
                        .categoryId(inv.getCategoryId())
                        .subcategoryId(inv.getSubcategoryId())
                        .barcode(inv.getBarcode())
                        .quantity(1)
                        .reservationStatus(ReservationStatus.RESERVED)
                        .reservedAt(LocalDateTime.now())
                        .expiresAt(LocalDateTime.now().plusMinutes(15))
                        .build());

                saveStatusHistory(inv, InventoryStatus.AVAILABLE.name(), InventoryStatus.RESERVED.name(),
                        "Reserved for order: " + request.getOrderNumber(), null);

                reservedItems.add(InventoryReservedItemDto.builder()
                        .barcode(inv.getBarcode())
                        .productId(inv.getProductId())
                        .categoryId(inv.getCategoryId())
                        .subcategoryId(inv.getSubcategoryId())
                        .inventoryStatus(InventoryStatus.RESERVED)
                        .quantity(1)
                        .build());
            });
        }

        return ReserveItemResponse.builder()
                .orderNumber(request.getOrderNumber())
                .items(reservedItems)
                .build();
    }

    /**
     * Find available inventory units — tries exact match (productId+categoryId+subcategoryId) first,
     * falls back to productId-only match if exact match returns nothing.
     */
    private List<Inventory> findAvailableUnits(ReserveItem item, int quantity) {
        List<Inventory> units = inventoryRepository.findTopNAvailable(
                item.getProductId(), item.getCategoryId(), item.getSubcategoryId(),
                InventoryStatus.AVAILABLE, PlatformStatus.ENABLED, ConditionStatus.GOOD,
                PageRequest.of(0, quantity));

        if (units.isEmpty()) {
            // Fallback: search by productId only (category/subcategory mismatch from frontend)
            units = inventoryRepository.findTopNAvailableByProductOnly(
                    item.getProductId(),
                    InventoryStatus.AVAILABLE, PlatformStatus.ENABLED, ConditionStatus.GOOD,
                    PageRequest.of(0, quantity));
        }
        return units;
    }

    // ===================== SELL CHECK =====================
    @Override
    public SellCheckResponse checkSellable(SellCheckRequest request) {
        List<String> insufficientItems = new ArrayList<>();

        List<SellItemResult> results = request.getItems().stream().map(item -> {
            int sellableCount = inventoryRepository.countSellableUnits(
                    item.getProductId(),
                    item.getCategoryId(),
                    item.getSubcategoryId(),
                    InventoryStatus.AVAILABLE,
                    PlatformStatus.ENABLED,
                    ConditionStatus.GOOD
            );

            // Fallback: if exact match returns 0, try productId-only count
            if (sellableCount == 0) {
                sellableCount = (int) inventoryRepository.countByProductIdAndInventoryStatusAndPlatformStatus(
                        item.getProductId(), InventoryStatus.AVAILABLE, PlatformStatus.ENABLED);
            }

            boolean sellable = sellableCount >= item.getRequestedQuantity();

            if (!sellable) {
                insufficientItems.add("productId=" + item.getProductId() + " (requested=" + item.getRequestedQuantity() + ", available=" + sellableCount + ")");
            }

            return new SellItemResult(item.getProductId(), item.getCategoryId(), item.getSubcategoryId(),
                    sellableCount, sellable);
        }).toList();

        if (!insufficientItems.isEmpty()) {
            throw new InsufficientInventoryException(
                    "Insufficient stock: " + String.join(", ", insufficientItems)
            );
        }

        return new SellCheckResponse(results);
    }


    // ===================== STOCK QUERIES =====================
    @Override
    public long countAvailableByProduct(Long productId) {
        return inventoryRepository.countByProductIdAndInventoryStatusAndPlatformStatus(
                productId, InventoryStatus.AVAILABLE, PlatformStatus.ENABLED);
    }

    @Override
    public long countAvailableByCategory(Long categoryId) {
        return inventoryRepository.countByCategoryIdAndInventoryStatusAndPlatformStatus(
                categoryId, InventoryStatus.AVAILABLE, PlatformStatus.ENABLED);
    }

    @Override
    public long countAvailableBySubCategory(Long subcategoryId) {
        return inventoryRepository.countBysubcategoryIdAndInventoryStatusAndPlatformStatus(subcategoryId, InventoryStatus.AVAILABLE, PlatformStatus.ENABLED);
    }

    @Override
    public List<AvailableStockResponse> getAvailableStockList(Long productId, Long categoryId, Long subcategoryId) {

        List<Inventory> inventories =
                inventoryRepository.findAvailableStock(productId, categoryId,
                        subcategoryId, InventoryStatus.AVAILABLE, PlatformStatus.ENABLED);

        return inventories.stream()
                .map(i -> new AvailableStockResponse(i.getId(), i.getBarcode(), i.getProductId(),
                        i.getCategoryId(), i.getSubcategoryId(), i.getInventoryStatus(), i.getPlatformStatus(), i.getConditionStatus()))
                .toList();
    }

    // ===================== ANALYTICS =====================
    @Override
    public List<DailySalesResponse> getDailySales(TransactionType type) {

        List<Object[]> rows = transactionRepository.getDailySales(type.name());
        System.out.println("Rows size = " + rows.size());


        rows.forEach(r -> {
            System.out.println(
                    "date=" + r[0] +
                            ", sales=" + r[1] +
                            ", cost=" + r[2] +
                            ", profit=" + r[3]
            );
        });
        return rows.stream()
                .map(r -> new DailySalesResponse(
                        ((Date) r[0]).toLocalDate(),
                        (BigDecimal) r[1],
                        (BigDecimal) r[2],
                        (BigDecimal) r[3]
                ))
                .toList();
    }


    @Override
    public List<DailySalesResponse> getSales(TransactionType type, LocalDate fromDate, LocalDate toDate) {

        List<Object[]> rows = transactionRepository.getSalesByDate(type.name(), fromDate, toDate);
        rows.forEach(r -> {
            System.out.println("Row: Date: " + r[0] + ",Sales " + r[1] + ",Cost " + r[2] + ",Profit " + r[3]);
        });
        return rows.stream()
                .map(r -> new DailySalesResponse(
                        ((java.sql.Date) r[0]).toLocalDate(),
                        (BigDecimal) r[1],
                        (BigDecimal) r[2],
                        (BigDecimal) r[3]
                ))
                .toList();
    }

    // Helper methods for type conversion
    private BigDecimal convertToBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Double) return BigDecimal.valueOf((Double) value);
        if (value instanceof Integer) return BigDecimal.valueOf((Integer) value);
        if (value instanceof Long) return BigDecimal.valueOf((Long) value);
        if (value instanceof String) {
            try {
                return new BigDecimal((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private Double convertToDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Double) return (Double) value;
        if (value instanceof BigDecimal) return ((BigDecimal) value).doubleValue();
        if (value instanceof Integer) return ((Integer) value).doubleValue();
        if (value instanceof Long) return ((Long) value).doubleValue();
        if (value instanceof String) {
            try {
                return Double.valueOf((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

}


