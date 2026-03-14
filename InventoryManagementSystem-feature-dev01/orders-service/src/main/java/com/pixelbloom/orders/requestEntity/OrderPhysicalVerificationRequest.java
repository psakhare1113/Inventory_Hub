package com.pixelbloom.orders.requestEntity;

import com.pixelbloom.orders.enums.InspectionStatus;
import com.pixelbloom.orders.enums.OrderStatus;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderPhysicalVerificationRequest {
        private String orderNumber;
        private String barcode;
        private Boolean approved;
        private String inspectedBy;
        private OrderStatus status;
        private String rejectionReason;
        private String inspectorRemarks;
    }
