package com.pixelbloom.orders.responseEntity;

import com.pixelbloom.orders.enums.InspectionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
@Data
@Builder
public class InventoryInspectionResponse {

    private String orderNumber;
    private String inspectionId;
    private String barcode;
    private boolean approved;
    private InspectionStatus status;
    private String rejectionReason;
    private LocalDateTime inspectedAt;

}
