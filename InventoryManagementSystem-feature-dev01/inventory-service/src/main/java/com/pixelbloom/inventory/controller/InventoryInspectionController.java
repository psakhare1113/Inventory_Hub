package com.pixelbloom.inventory.controller;

import com.pixelbloom.inventory.model.SuccessResponseDTO;
import com.pixelbloom.inventory.requestEntity.InspectionRequestDto;
import com.pixelbloom.inventory.requestEntity.InspectionResponse;
import com.pixelbloom.inventory.requestEntity.InventoryInspectionRequest;
import com.pixelbloom.inventory.requestEntity.orderInspectionRequest;
import com.pixelbloom.inventory.service.InventoryInspectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryInspectionController {

    private final InventoryInspectionService inspectionService;

    @PostMapping("/inspection")
    public ResponseEntity<InspectionResponse> completeInspection(@RequestBody InventoryInspectionRequest request) {
        InspectionResponse response = inspectionService.completeInspection(request);
        return ResponseEntity.ok(response);
    }



    @GetMapping("/inspectionStatus")
    public ResponseEntity<InspectionResponse> getInspection(@RequestParam String orderNumber, @RequestParam String barcode) {
        InspectionRequestDto request = new InspectionRequestDto();
        request.setOrderNumber(orderNumber);
        request.setBarcode(barcode);
        return ResponseEntity.ok(inspectionService.getInspection(request));
    }



    @PostMapping("/orderReturn-Initiated")
    public ResponseEntity<SuccessResponseDTO> orderReturnInitiated(@RequestBody orderInspectionRequest request) {
        SuccessResponseDTO response = inspectionService.orderReturnInitiated(request);
        return ResponseEntity.ok(response);
    }
}