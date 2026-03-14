package com.pixelbloom.inventory.service;

import com.pixelbloom.inventory.model.SuccessResponseDTO;
import com.pixelbloom.inventory.requestEntity.InspectionRequestDto;
import com.pixelbloom.inventory.requestEntity.InspectionResponse;
import com.pixelbloom.inventory.requestEntity.InventoryInspectionRequest;
import com.pixelbloom.inventory.requestEntity.orderInspectionRequest;

public interface InventoryInspectionService {
    InspectionResponse completeInspection(InventoryInspectionRequest request);

    InspectionResponse getInspection(InspectionRequestDto inspectionRequest);

    SuccessResponseDTO orderReturnInitiated(orderInspectionRequest request);
}
