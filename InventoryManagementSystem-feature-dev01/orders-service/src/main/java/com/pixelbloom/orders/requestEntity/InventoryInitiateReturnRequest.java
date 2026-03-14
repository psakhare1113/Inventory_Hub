package com.pixelbloom.orders.requestEntity;

import com.pixelbloom.orders.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryInitiateReturnRequest {
    private String orderNumber;
    private String barcode; // Changed from List<String> barcodes
    private OrderStatus orderStatus;
    private String returnReference;
    private String returnReason;
    private Boolean damageDeclared;
    private String damageReason;
    private List<String> images;
}
