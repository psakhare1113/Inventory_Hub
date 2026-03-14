package com.pixelbloom.inventory.service;
import com.pixelbloom.inventory.enums.InventoryStatus;
import com.pixelbloom.inventory.enums.PlatformStatus;
import com.pixelbloom.inventory.enums.TransactionType;
import com.pixelbloom.inventory.model.*;
import com.pixelbloom.inventory.requestEntity.AdminInventoryUpdateRequest;
import com.pixelbloom.inventory.requestEntity.PriceUpdateRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface InventoryService {

        // ===================== ADMIN APIs =====================
        Inventory addInventory(Inventory inventory);


        Inventory updatePrice(String barcode, PriceUpdateRequest request);

        void disableInventory(String barcode, Long adminId);

        void enableInventory(String barcode, Long adminId);

        Inventory updateInventoryStatus(String barcode, AdminInventoryUpdateRequest request);

        // ===================== ORDER ORCHESTRATION =====================
        ReserveItemResponse reserveInventoryForOrder(InventoryReserveRequest request);

    ReserveItemResponse releaseInventoryForOrder(InventoryReleaseRequest request);

      //  void confirmSale(InventoryConfirmSaleRequest request);

        // ===================== SELL CHECK =====================
        SellCheckResponse checkSellable(SellCheckRequest request);

        // ===================== STOCK QUERIES =====================
        long countAvailableByProduct(Long productId);

        long countAvailableByCategory(Long categoryId);

        long countAvailableBySubCategory(Long subcategoryId);

    List<AvailableStockResponse> getAvailableStockList(Long productId, Long categoryId, Long subcategoryId);

    List<DailySalesResponse> getDailySales(TransactionType type);

    void confirmOrder(String orderId);

    List<DailySalesResponse> getSales(TransactionType type, LocalDate fromDate, LocalDate toDate);

    // ===================== ANALYTICS =====================
  //  List<Object[]> getDailySales();

    // ===================== ANALYTICS =====================
       // List<DailySalesResponse> getDailySales();

}