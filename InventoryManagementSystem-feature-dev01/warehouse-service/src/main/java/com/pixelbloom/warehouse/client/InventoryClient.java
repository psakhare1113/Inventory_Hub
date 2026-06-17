package com.pixelbloom.warehouse.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;

/**
 * HTTP client to add stock into inventory-service after GRN putaway is complete.
 *
 * Flow:
 *   GRN putaway complete
 *     → InventoryClient.addStock(...)
 *     → POST http://inventory-service:9093/api/inventory/add
 *     → inventory-service saves a new Inventory row (status = AVAILABLE)
 */
@Component
public class InventoryClient {

    private final RestTemplate restTemplate;
    private final String inventoryServiceUrl;

    public InventoryClient(RestTemplate restTemplate,
                           @Value("${inventory.service.url:http://localhost:9093}") String inventoryServiceUrl) {
        this.restTemplate = restTemplate;
        this.inventoryServiceUrl = inventoryServiceUrl;
    }

    /**
     * Get available stock count for a product from inventory-service.
     * GET /api/inventory/stock/product-count?productId=X
     * Returns -1 if inventory-service is unreachable.
     */
    public long getAvailableStock(Long productId) {
        try {
            String url = inventoryServiceUrl + "/api/inventory/stock/product-count?productId=" + productId;
            Long count = restTemplate.getForObject(url, Long.class);
            return count != null ? count : 0L;
        } catch (Exception e) {
            return -1L; // -1 = service unreachable, skip auto-PO for this product
        }
    }

    /**
     * Add one accepted unit to inventory-service.
     * Called once per accepted qty unit in a GRN line after putaway.
     *
     * @param request  the inventory item to create
     * @return true if the call succeeded
     */
    public boolean addStock(AddStockRequest request) {
        try {
            String url = inventoryServiceUrl + "/api/inventory/add";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<AddStockRequest> entity = new HttpEntity<>(request, headers);

            restTemplate.postForObject(url, entity, Object.class);
            return true;
        } catch (Exception e) {
            // Log but don't crash — caller decides how to handle
            return false;
        }
    }

    // ── Request DTO matching Inventory entity in inventory-service ────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddStockRequest {
        private String barcode;          // unique per unit, e.g. "GRN-001-P5-1"
        private Long productId;
        private Long categoryId;         // nullable — inventory-service accepts null
        private Long subcategoryId;      // nullable
        private Long warehouseId;
        private String inventoryStatus;  // "AVAILABLE"
        private String platformStatus;   // "ENABLED"
        private String conditionStatus;  // "GOOD" | "CUSTOMER_DAMAGED" | "WAREHOUSE_DAMAGED"
        private BigDecimal mrp;
        private BigDecimal showroomPrice;
        private BigDecimal buyPrice;
        private BigDecimal sellingPrice;
        private String stockSource;      // "SUPPLIER"
        private Boolean isCustomerReturned;
        private Boolean isWarehouseDamaged;
        private Long createdBy;
    }
}
