package com.pixelbloom.inventory.model;

import com.pixelbloom.inventory.enums.ConditionStatus;
import com.pixelbloom.inventory.enums.InventoryStatus;
import com.pixelbloom.inventory.enums.PlatformStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryWithProductDetails {
    
    // Inventory fields
    private Long id;
    private String barcode;
    private Long productId;
    private Long categoryId;
    private Long subcategoryId;
    private Long warehouseId;
    private InventoryStatus inventoryStatus;
    private PlatformStatus platformStatus;
    private ConditionStatus conditionStatus;
    private BigDecimal mrp;
    private BigDecimal showroomPrice;
    private BigDecimal buyPrice;
    private BigDecimal sellingPrice;
    private String stockSource;
    private Boolean isCustomerReturned;
    private Boolean isWarehouseDamaged;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;
    private Long updatedBy;
    
    // Product details
    private String productName;
    private String productDescription;
    private String productBarcode;
    private String productUrl;
    private String productStatus;
    private boolean eligibleForReturn;
    
    // Category details
    private String categoryName;
    private String subcategoryName;
    
    // Pricing details from product pricing table
    private BigDecimal productMrp;
    private BigDecimal productSellingPrice;
    private Double unitSize;
    private String unitLabel;
}