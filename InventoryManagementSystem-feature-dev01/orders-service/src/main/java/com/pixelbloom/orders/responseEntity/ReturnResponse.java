package com.pixelbloom.orders.responseEntity;

import com.pixelbloom.orders.enums.InspectionStatus;
import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.enums.ReturnStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReturnResponse {
    private String returnReference;
    private String barcode;
    private String inspectionId;
    private String orderNumber;
    private ReturnStatus returnStatus;
    private LocalDateTime returnedStartedAt;
    private Boolean approved;
    private String message;
    private InspectionStatus status;
    private String rejectionReason;

}
