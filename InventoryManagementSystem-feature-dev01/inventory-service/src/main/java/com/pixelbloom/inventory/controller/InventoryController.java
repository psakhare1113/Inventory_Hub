package com.pixelbloom.inventory.controller;

import com.pixelbloom.inventory.enums.InventoryStatus;
import com.pixelbloom.inventory.enums.TransactionType;
import com.pixelbloom.inventory.exception.ResourceNotFoundException;
import com.pixelbloom.inventory.model.*;
import com.pixelbloom.inventory.requestEntity.AdminInventoryUpdateRequest;
import com.pixelbloom.inventory.requestEntity.PriceUpdateRequest;
import com.pixelbloom.inventory.repository.InventoryRepository;
import com.pixelbloom.inventory.repository.InventoryReservationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.pixelbloom.inventory.service.InventoryService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final InventoryRepository inventoryRepository;
    private final InventoryReservationRepository reservationRepository;

    public InventoryController(InventoryService inventoryService,
                               InventoryRepository inventoryRepository,
                               InventoryReservationRepository reservationRepository) {
        this.inventoryService = inventoryService;
        this.inventoryRepository = inventoryRepository;
        this.reservationRepository = reservationRepository;
    }

    // ======================================================
    // ===================== ADMIN APIs =====================
    // ======================================================

    /**
     * Get all inventory items with product details
     * Used by admin dashboard to display inventory with product information
     */
    @GetMapping
    public List<InventoryWithProductDetails> getAllInventoryWithProductDetails() {
        return inventoryService.getAllInventoryWithProductDetails();
    }

    /**
     * Get inventory item by barcode with product details
     */
    @GetMapping("/barcode/{barcode}")
    public ResponseEntity<InventoryWithProductDetails> getInventoryByBarcode(@PathVariable String barcode) {
        List<InventoryWithProductDetails> allInventory = inventoryService.getAllInventoryWithProductDetails();
        InventoryWithProductDetails inventory = allInventory.stream()
                .filter(inv -> inv.getBarcode().equals(barcode))
                .findFirst()
                .orElse(null);
        
        if (inventory != null) {
            return ResponseEntity.ok(inventory);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get inventory items by product ID
     */
    @GetMapping("/product/{productId}")
    public List<InventoryWithProductDetails> getInventoryByProductId(@PathVariable Long productId) {
        List<InventoryWithProductDetails> allInventory = inventoryService.getAllInventoryWithProductDetails();
        return allInventory.stream()
                .filter(inv -> inv.getProductId().equals(productId))
                .toList();
    }

    /**
     * Test endpoint to verify inventory service is working
     */
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testInventoryService() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Inventory service is running");
        response.put("timestamp", LocalDateTime.now());
        response.put("inventoryCount", inventoryService.getAllInventoryWithProductDetails().size());
        return ResponseEntity.ok(response);
    }

    /**
     * Admin adds a new physical inventory item (barcode-level)
     * Example: New TV unit received in warehouse
     */
    @PostMapping("/add")
    public ResponseEntity<Map<String, Object>> addInventory(@RequestBody Inventory inventory) {
        try {
            Inventory savedInventory = inventoryService.addInventory(inventory);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Inventory added successfully");
            response.put("inventory", savedInventory);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to add inventory: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Update complete inventory item
     */
    @PutMapping("/{barcode}")
    public ResponseEntity<Map<String, Object>> updateInventory(@PathVariable String barcode, @RequestBody Inventory inventoryUpdate) {
        try {
            Inventory existingInventory = inventoryRepository.findByBarcode(barcode)
                    .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));
            
            // Update all fields
            existingInventory.setProductId(inventoryUpdate.getProductId());
            existingInventory.setCategoryId(inventoryUpdate.getCategoryId());
            existingInventory.setSubcategoryId(inventoryUpdate.getSubcategoryId());
            existingInventory.setWarehouseId(inventoryUpdate.getWarehouseId());
            existingInventory.setInventoryStatus(inventoryUpdate.getInventoryStatus());
            existingInventory.setPlatformStatus(inventoryUpdate.getPlatformStatus());
            existingInventory.setConditionStatus(inventoryUpdate.getConditionStatus());
            existingInventory.setMrp(inventoryUpdate.getMrp());
            existingInventory.setShowroomPrice(inventoryUpdate.getShowroomPrice());
            existingInventory.setBuyPrice(inventoryUpdate.getBuyPrice());
            existingInventory.setSellingPrice(inventoryUpdate.getSellingPrice());
            existingInventory.setStockSource(inventoryUpdate.getStockSource());
            existingInventory.setIsCustomerReturned(inventoryUpdate.getIsCustomerReturned());
            existingInventory.setIsWarehouseDamaged(inventoryUpdate.getIsWarehouseDamaged());
            existingInventory.setUpdatedBy(inventoryUpdate.getUpdatedBy());
            
            Inventory savedInventory = inventoryRepository.save(existingInventory);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Inventory updated successfully");
            response.put("inventory", savedInventory);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to update inventory: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /*** Admin corrects pricing for a specific barcode  (MRP / showroom / selling price)   */
    @PutMapping("/{barcode}/price")
    public Inventory updatePrice(@PathVariable String barcode,@RequestBody PriceUpdateRequest request
    ) {
        return inventoryService.updatePrice(barcode, request);
    }

    /*** Admin disables an inventory item from platform visibility Example: damaged / internal hold / audit    */
    @PatchMapping("/{barcode}/disable")
    public ResponseEntity<Map<String, Object>> disableInventory(@PathVariable String barcode,@RequestParam Long adminId) {
        try {
            inventoryService.disableInventory(barcode, adminId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Inventory disabled successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to disable inventory: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    /**
     * Permanently delete inventory item (admin only)
     */
    @DeleteMapping("/{barcode}")
    public ResponseEntity<Map<String, Object>> deleteInventory(@PathVariable String barcode) {
        try {
            Inventory inventory = inventoryRepository.findByBarcode(barcode)
                    .orElseThrow(() -> new ResourceNotFoundException("Inventory not found"));
            
            // Check if inventory can be deleted (not sold or reserved)
            if (inventory.getInventoryStatus() == InventoryStatus.SALE || 
                inventory.getInventoryStatus() == InventoryStatus.RESERVED) {
                throw new IllegalStateException("Cannot delete sold or reserved inventory");
            }
            
            inventoryRepository.delete(inventory);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Inventory deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to delete inventory: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
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

    /**
     * Admin/Dev: Force-release stale reservation by barcode.
     * Use when a reservation is stuck in DB after a failed order attempt.
     * POST /api/inventory/reservation/force-release
     * Body: { "barcodes": ["PRD-xxx-1", "PRD-xxx-2"] }
     */
    @PostMapping("/reservation/force-release")
    public ResponseEntity<Map<String, Object>> forceReleaseReservation(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> barcodes = (List<String>) request.get("barcodes");
            if (barcodes == null || barcodes.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "barcodes list is required"));
            }

            List<String> released = new ArrayList<>();
            List<String> notFound  = new ArrayList<>();

            for (String barcode : barcodes) {
                reservationRepository.findByBarcode(barcode).ifPresentOrElse(res -> {
                    // Restore inventory to AVAILABLE
                    inventoryRepository.findById(res.getInventoryId()).ifPresent(inv -> {
                        if (inv.getInventoryStatus() == InventoryStatus.RESERVED) {
                            inv.setInventoryStatus(InventoryStatus.AVAILABLE);
                            inventoryRepository.save(inv);
                        }
                    });
                    reservationRepository.delete(res);
                    released.add(barcode);
                    log.info("Force-released reservation for barcode={}", barcode);
                }, () -> notFound.add(barcode));
            }

            return ResponseEntity.ok(Map.of(
                    "released", released,
                    "notFound",  notFound,
                    "message",   "Force release completed"
            ));
        } catch (Exception e) {
            log.error("Force release failed", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
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
        response.put("stockCount", availableCount);  // exact count
        response.put("stockLevel", availableCount > 10 ? "HIGH" : availableCount > 0 ? "LOW" : "OUT_OF_STOCK");

        return ResponseEntity.ok(response);
    }

    /**
     * Get pricing data for a product from products service
     * Used by admin when adding inventory to auto-fill pricing fields
     */
    @GetMapping("/pricing/{productId}")
    public ResponseEntity<Map<String, Object>> getProductPricing(@PathVariable Long productId) {
        try {
            Map<String, Object> pricingData = inventoryService.getProductPricing(productId);
            return ResponseEntity.ok(pricingData);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to fetch pricing: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

}