package com.pixelbloom.inventory.requestEntity;

import com.pixelbloom.inventory.enums.InspectionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

import java.util.Map;

@Data
@Builder
public class InspectionResponse {
    private String orderNumber;
    private String inspectionId;
    private String barcode;
    private boolean approved;
    private InspectionStatus status;
    private String rejectionReason;
    private LocalDateTime inspectedAt;
    private String message;
}

