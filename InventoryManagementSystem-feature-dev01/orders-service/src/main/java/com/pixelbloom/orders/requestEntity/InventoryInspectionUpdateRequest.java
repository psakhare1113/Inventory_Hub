package com.pixelbloom.orders.requestEntity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryInspectionUpdateRequest {
    private String orderNumber;
    private String barcode;
    private Boolean approved;
    private String inspectorRemarks;
    private String itemCondition;
    private List<String> inspectionImages;
    private String inspectedBy;
}
