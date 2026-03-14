package com.pixelbloom.orders.responseEntity;

import com.pixelbloom.orders.enums.InspectionStatus;
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
public class OrderPhysicalInspectionResponse {
    private String orderNumber;
    private String inspectionId;
    private List<String> barcodes;
    private Boolean approved;
    private OrderStatus status;
    private String rejectionReason;
    private LocalDateTime inspectedAt;



}
