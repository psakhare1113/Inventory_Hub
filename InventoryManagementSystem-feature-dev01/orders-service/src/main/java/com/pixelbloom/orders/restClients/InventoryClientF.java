package com.pixelbloom.orders.restClients;

import com.pixelbloom.orders.config.FeignConfig;
import com.pixelbloom.orders.requestEntity.*;
import com.pixelbloom.orders.responseEntity.InventoryInspectionResponse;
import com.pixelbloom.orders.responseEntity.OrderPhysicalInspectionResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(name = "api-gateway",url = "${api.gateway.url:http://localhost:9999}",
        configuration = FeignConfig.class)

public interface InventoryClientF {
    @PostMapping("/api/inventory/reserve")
    void reserveInventory(@RequestBody InventoryReserveRequest request);

    @PostMapping("/api/inventory/confirm")
    void confirmSale(@RequestParam("orderNumber") String orderNumber);

    @PostMapping("/api/inventory/release")
    void releaseReservation(@RequestBody InventoryReleaseRequest request);


    @GetMapping("/api/inventory/inspectionStatus")
    InventoryInspectionResponse getPhysicalStatusApproval(@RequestParam("orderNumber") String orderNumber,@RequestParam("barcode") String barcode);

    @PostMapping("/api/inventory/inspection")
    OrderPhysicalInspectionResponse getPhysicalVerificationDone(@RequestBody OrderPhysicalVerificationRequest request);

    @PostMapping("/api/inventory/orderReturn-Initiated")
    void returnInitiated(@RequestBody InventoryInitiateReturnRequest request);
}

