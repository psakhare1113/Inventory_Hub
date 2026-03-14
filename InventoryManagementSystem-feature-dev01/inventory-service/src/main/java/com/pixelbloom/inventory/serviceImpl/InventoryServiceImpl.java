package com.pixelbloom.inventory.serviceImpl;

import com.pixelbloom.inventory.enums.*;
import com.pixelbloom.inventory.exception.DuplicateResourceException;
import com.pixelbloom.inventory.exception.InsufficientInventoryException;
import com.pixelbloom.inventory.exception.ResourceNotFoundException;
import com.pixelbloom.inventory.model.*;
import com.pixelbloom.inventory.repository.InventoryReservationRepository;
import com.pixelbloom.inventory.repository.InventoryTransactionRepository;
import com.pixelbloom.inventory.requestEntity.AdminInventoryUpdateRequest;
import com.pixelbloom.inventory.requestEntity.PriceUpdateRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.pixelbloom.inventory.repository.InventoryRepository;
import com.pixelbloom.inventory.service.InventoryService;

import java.sql.Date;
import java.math.BigDecimal;
import java.sql.SQLIntegrityConstraintViolationException;
import java.time.LocalDate;
import java.time.LocalDateTime;

import java.util.ArrayList;
import java.util.List;

@Service
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryReservationRepository reservationRepository;
    private final InventoryTransactionRepository transactionRepository;

    public InventoryServiceImpl(InventoryRepository inventoryRepository,InventoryReservationRepository reservationRepository,InventoryTransactionRepository transactionRepository) {
        this.inventoryRepository = inventoryRepository;
        this.reservationRepository = reservationRepository;
        this.transactionRepository = transactionRepository;
    }

    // ===================== ADMIN APIs =====================

    public Inventory addInventory(Inventory inventory) {
        try {
            // Check if barcode already exists
            if (inventoryRepository.existsByBarcode(inventory.getBarcode())) {
                throw new DuplicateResourceException("Inventory with barcode '" + inventory.getBarcode() + "' already exists");
            }
            inventory.setInventoryStatus(InventoryStatus.AVAILABLE);
            inventory.setPlatformStatus(PlatformStatus.ENABLED);
            inventory.setConditionStatus(ConditionStatus.GOOD);
            inventory.setIsCustomerReturned(false);
            inventory.setIsWarehouseDamaged(false);
            return inventoryRepository.save(inventory);
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

        inventory.setPlatformStatus(PlatformStatus.DISABLED);
        inventory.setInventoryStatus(InventoryStatus.REMOVED);
        inventory.setUpdatedBy(adminId);
        inventoryRepository.save(inventory);
    }

    @Override
    @Transactional
    public void enableInventory(String barcode, Long adminId) {
        Inventory inventory = inventoryRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));

        inventory.setPlatformStatus(PlatformStatus.ENABLED);
        inventory.setInventoryStatus(InventoryStatus.AVAILABLE);
        inventory.setUpdatedBy(adminId);

        inventoryRepository.save(inventory);
    }

    @Override
    @Transactional
    public Inventory updateInventoryStatus(String barcode, AdminInventoryUpdateRequest request) {
        Inventory inventory = inventoryRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));

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
        return inventoryRepository.save(inventory);
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
        }
    }

    @Override
    @Transactional
    public ReserveItemResponse reserveInventoryForOrder(InventoryReserveRequest request) {

        List<InventoryReservedItemDto> reservedItems = new ArrayList<>();
        List<String> insufficientItems = new ArrayList<>();

        // First, check all items for availability
        for (ReserveItem item : request.getItems()) {
            System.out.println("@@@@@@@@   Checking item: productId=" + item.getProductId() + ", quantity=" + item.getQuantity());


            List<Inventory> availableUnits = inventoryRepository.findTopNAvailable(item.getProductId(), item.getCategoryId(), item.getSubcategoryId(),
                    InventoryStatus.AVAILABLE, PlatformStatus.ENABLED, ConditionStatus.GOOD, PageRequest.of(0, item.getQuantity()));

            if (availableUnits.size() < item.getQuantity()) {
                System.out.println("Insufficient items list:->>>>>>>>>>>>>>>>> " + insufficientItems);
                System.out.println("Comparison: " + availableUnits.size() + " < " + item.getQuantity() + " = " + (availableUnits.size() < item.getQuantity()));
                insufficientItems.add("productId=" + item.getProductId() + " (requested=" + item.getQuantity() + ", available=" + availableUnits.size() + ")");
            }


        }

        // If any item is insufficient, throw exception with all details
        if (!insufficientItems.isEmpty()) {
            throw new InsufficientInventoryException("Insufficient stock: " + String.join(", ", insufficientItems));
        }

        // Now reserve all items
        for (ReserveItem item : request.getItems()) {
            List<Inventory> availableUnits = inventoryRepository.findTopNAvailable(item.getProductId(), item.getCategoryId(),
                    item.getSubcategoryId(), InventoryStatus.AVAILABLE, PlatformStatus.ENABLED, ConditionStatus.GOOD,
                    PageRequest.of(0, item.getQuantity()));//all items on 0th page


            availableUnits.stream().limit(item.getQuantity()).forEach(inv -> {
                inv.setInventoryStatus(InventoryStatus.RESERVED);
                inventoryRepository.save(inv);

                reservationRepository.save(InventoryReservation.builder().orderNumber(request.getOrderNumber())
                        .inventoryId(inv.getId()).productId(inv.getProductId()).categoryId(inv.getCategoryId())
                        .subcategoryId(inv.getSubcategoryId()).barcode(inv.getBarcode())
                        .quantity(1).reservationStatus(ReservationStatus.RESERVED).reservedAt(LocalDateTime.now())
                        .expiresAt(LocalDateTime.now().plusMinutes(15)).build()
                );

                reservedItems.add(InventoryReservedItemDto.builder().barcode(inv.getBarcode())
                        .productId(inv.getProductId()).categoryId(inv.getCategoryId()).subcategoryId(inv.getSubcategoryId())
                        .inventoryStatus(InventoryStatus.RESERVED).quantity(1).build());
            });
        }

        return ReserveItemResponse.builder().orderNumber(request.getOrderNumber()).items(reservedItems).build();
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

}


