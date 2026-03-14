package com.pixelbloom.inventory.requestEntity;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class InventoryInspectionRequest {
    private String orderNumber;
    private String  barcode;  // barcode -> approved
    private String returnReference;
    private String inspectedBy;
    private String inspectorRemarks;
    private Boolean approved;

    private String rejectionReason;
}

