package com.pixelbloom.inventory.controller;

import com.pixelbloom.inventory.enums.TransactionType;
import com.pixelbloom.inventory.model.*;
import com.pixelbloom.inventory.requestEntity.AdminInventoryUpdateRequest;
import com.pixelbloom.inventory.requestEntity.PriceUpdateRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.pixelbloom.inventory.service.InventoryService;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * InventoryController
 *
 * Responsibility:
 * - Manage physical inventory (stock, condition, platform availability) - Coordinate with Order-Service for reservation, release, sale confirmation
 * - Provide analytics on inventory movement
 *
 * IMPORTANT:
 * - Customers NEVER call inventory-service directly * - Order-service is the main orchestrator */
@RestController
@RequestMapping("/api/inventory")
@Slf4j
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    // ======================================================
    // ===================== ADMIN APIs =====================
    // ======================================================

    /**
     * Admin adds a new physical inventory item (barcode-level)
     * Example: New TV unit received in warehouse
     */
    @PostMapping("/add")
    public Inventory addInventory(@RequestBody Inventory inventory) {
        return inventoryService.addInventory(inventory);
    }

    /*** Admin corrects pricing for a specific barcode  (MRP / showroom / selling price)   */
    @PatchMapping("/{barcode}/price")
    public Inventory updatePrice(@PathVariable String barcode,@RequestBody PriceUpdateRequest request
    ) {
        return inventoryService.updatePrice(barcode, request);
    }

    /*** Admin disables an inventory item from platform visibility Example: damaged / internal hold / audit    */
    @PatchMapping("/{barcode}/disable")
    public void disableInventory(@PathVariable String barcode,@RequestParam Long adminId) {
        inventoryService.disableInventory(barcode, adminId);
    }

    /*** Admin re-enables a previously disabled inventory item   */
    @PatchMapping("/{barcode}/enable")
    public void enableInventory(@PathVariable String barcode,@RequestParam Long adminId) {
        inventoryService.enableInventory(barcode, adminId);
    }

    /*** Admin updates inventory state (condition, platform status, flags) Used for audits, QC checks, warehouse corrections  */
    @PatchMapping("/{barcode}/status")
    public Inventory updateInventoryStatus(@PathVariable String barcode, @RequestBody AdminInventoryUpdateRequest request) {
        return inventoryService.updateInventoryStatus(barcode, request);
    }

    // ======================================================
    // ============== ORDER–INVENTORY ORCHESTRATION =========
    // ======================================================

    /*** Reserve inventory AFTER payment success Called ONLY by order-service  Inventory moves: * AVAILABLE → RESERVED   */
    @PostMapping("/reserve")
    public ReserveItemResponse reserveInventory(@RequestBody InventoryReserveRequest request,@RequestHeader(value = "X-User-Name", required = false) String username,
                                                @RequestHeader(value = "X-User-Role", required = false) String userRole) {
         log.info("Reserve request from user: {} with role: {}", username, userRole);
         return inventoryService.reserveInventoryForOrder(request);
   }

    /*** Release reserved inventory- Scenarios:- Payment failed - Order cancelled - Refund approved  * Inventory moves: RESERVED → AVAILABLE  */
    @PostMapping("/release")
    public ReserveItemResponse  releaseInventory(@RequestBody InventoryReleaseRequest request) {
       return inventoryService.releaseInventoryForOrder(request);

    }

    /** Confirm sale after delivery success Called by order-service after shipping confirmation Inventory moves: RESERVED → SOLD  Inventory transaction is recorded
     * Order Paid (Orders Service)  When payment is successful: ORDER_STATUS = CONFIRMED PAYMENT_STATUS = SUCCESS   */
    @PostMapping("/confirm")
    public ResponseEntity<Void>  confirmSale(@RequestParam String orderNumber) {
       inventoryService.confirmOrder(orderNumber);
        return ResponseEntity.ok().build();
    }

    // ======================================================
    // ===================== SELL CHECK =====================
    // ======================================================

    /** Sell-check API Used by product-service / order-service Determines if requested quantity is sellable=false ->means stock quanity is not available or status condition of product is not..     //true -> can sell and customer can add to cart this api will check availability while adding to cart   * DOES NOT reserve stock
     */
    @PostMapping("/sell-check")
    public SellCheckResponse checkSellable(@RequestBody SellCheckRequest request) {
        return inventoryService.checkSellable(request);
    }

    // ======================================================
    // ===================== STOCK QUERIES ==================
    // ======================================================

    /** Get available stock count by product  */
    @GetMapping("/stock/product-count")
    public long stockByProduct(@RequestParam  Long productId) {
        return inventoryService.countAvailableByProduct(productId);
    }

    /** Get available stock count by category  */
    @GetMapping("/stock/category-count")
    public long stockByCategory(@RequestParam  Long categoryId) {
        return inventoryService.countAvailableByCategory(categoryId);
    }

    /**Get available stock count by subcategory  */
    @GetMapping("/stock/subcategory-count")
    public long stockBySubCategory(@RequestParam Long subcategoryId) {
        return inventoryService.countAvailableBySubCategory(subcategoryId);
    }

    /*optional GET /api/inventory/stock/product?productId=101  GET /api/inventory/stock/product?categoryId=11  GET /api/inventory/stock/product?subcategoryId=1     */
    @GetMapping("/stock/product")
    public List<AvailableStockResponse> getAvailableStockList(@RequestParam(required = false) Long productId, @RequestParam(required = false) Long categoryId,@RequestParam(required = false) Long subcategoryId) {
        return inventoryService.getAvailableStockList(productId, categoryId, subcategoryId);
    }

    // ======================================================
    // ===================== ANALYTICS ======================
    // ======================================================

    /** Daily sales analytics Used by admin dashboards */
   @GetMapping("/analytics/sales/daily")
   public List<DailySalesResponse> getDailySales(@RequestParam ("type") TransactionType type) {
       var result = inventoryService.getDailySales(type);
       System.out.println("Controller size = " + result.size());
       return inventoryService.getDailySales(type);
   }

   @GetMapping("/analytics/sales/from-to")
    public List<DailySalesResponse> getSalesByDate (@RequestParam ("type") TransactionType type, @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam("to") @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate toDate){  var response = inventoryService.getSales(type,fromDate,toDate);
            System.out.println("Sales from date to Date"+response);
       return inventoryService.getSales(type,fromDate,toDate);

   }



    /**
     * USER: Check if product is available for purchase
     * Used by frontend to show "In Stock" / "Out of Stock"
     */
    @GetMapping("/stock/check")
    public ResponseEntity<Boolean> checkProductAvailability(@RequestParam Long productId, @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long subcategoryId,@RequestParam(defaultValue = "1") int quantity) {

        SellItem sellItem = new SellItem(productId, categoryId, subcategoryId, quantity);
        SellCheckRequest request = new SellCheckRequest(List.of(sellItem));
        SellCheckResponse response = inventoryService.checkSellable(request);
        return ResponseEntity.ok(response.isSellable());
    }
    /*
    # Check if 1 unit of product is available
GET /api/auth/user/inventory/stock/check?productId=101

# Check if 5 units of product is available with category info
GET /api/auth/user/inventory/stock/check?productId=101&categoryId=10&subcategoryId=5&quantity=5

# Check multiple quantity
GET /api/auth/user/inventory/stock/check?productId=101&quantity=3

     */


    /**
     * USER: Get available stock count for a product (limited info)
     */
    @GetMapping("/stock/availability")
    public ResponseEntity<Map<String, Object>> getProductAvailability(@RequestParam Long productId) {
        long availableCount = inventoryService.countAvailableByProduct(productId);

        Map<String, Object> response = new HashMap<>();
        response.put("productId", productId);
        response.put("available", availableCount > 0);
        response.put("stockLevel", availableCount > 10 ? "HIGH" : availableCount > 0 ? "LOW" : "OUT_OF_STOCK");
        // Don't expose exact count for security reasons

        return ResponseEntity.ok(response);
    }

}