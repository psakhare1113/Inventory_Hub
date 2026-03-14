package com.pixelbloom.orders.requestEntity;

import com.pixelbloom.orders.enums.OrderStatus;
import lombok.Builder;
import lombok.Data;

import java.util.Map;
@Data
@Builder
public class InventoryInspectionRequest {
    private String orderNumber;
    private String barcode;
    private String returnReference;
    private String inspectedBy;
    private String inspectorRemarks;
    private Boolean approved; // Add this
    private String rejectionReason;
}


