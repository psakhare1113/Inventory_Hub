package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.dto.CreateTransferRequest;
import com.pixelbloom.warehouse.model.InventoryTransfer;
import com.pixelbloom.warehouse.service.TransferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouse/transfers")
@RequiredArgsConstructor
@Tag(name = "Inventory Transfers", description = "Inventory Transfer Management APIs")
public class TransferController {

    private final TransferService transferService;

    @PostMapping
    @Operation(summary = "Create Transfer", description = "Create inventory transfer request (FR-80)")
    public ResponseEntity<InventoryTransfer> createTransfer(
            @Valid @RequestBody CreateTransferRequest request,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        
        InventoryTransfer transfer = transferService.createTransfer(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(transfer);
    }

    @PutMapping("/{transferId}/approve")
    @Operation(summary = "Approve Transfer", description = "Approve transfer request")
    public ResponseEntity<InventoryTransfer> approveTransfer(
            @PathVariable Long transferId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        
        InventoryTransfer transfer = transferService.approveTransfer(transferId, userId);
        return ResponseEntity.ok(transfer);
    }

    @PutMapping("/{transferId}/pick")
    @Operation(summary = "Mark as Picked", description = "Mark transfer as picked (in transit)")
    public ResponseEntity<InventoryTransfer> markAsPicked(
            @PathVariable Long transferId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        
        InventoryTransfer transfer = transferService.markAsPicked(transferId, userId);
        return ResponseEntity.ok(transfer);
    }

    @PutMapping("/{transferId}/receive")
    @Operation(summary = "Receive Transfer", description = "Receive transfer at destination")
    public ResponseEntity<InventoryTransfer> receiveTransfer(
            @PathVariable Long transferId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        
        InventoryTransfer transfer = transferService.receiveTransfer(transferId, userId);
        return ResponseEntity.ok(transfer);
    }

    @PutMapping("/{transferId}/complete")
    @Operation(summary = "Complete Transfer", description = "Complete transfer (inventory updated)")
    public ResponseEntity<InventoryTransfer> completeTransfer(@PathVariable Long transferId) {
        InventoryTransfer transfer = transferService.completeTransfer(transferId);
        return ResponseEntity.ok(transfer);
    }

    @PutMapping("/{transferId}/cancel")
    @Operation(summary = "Cancel Transfer", description = "Cancel transfer request")
    public ResponseEntity<InventoryTransfer> cancelTransfer(@PathVariable Long transferId) {
        InventoryTransfer transfer = transferService.cancelTransfer(transferId);
        return ResponseEntity.ok(transfer);
    }

    @GetMapping("/{transferId}")
    @Operation(summary = "Get Transfer", description = "Get transfer by ID")
    public ResponseEntity<InventoryTransfer> getTransfer(@PathVariable Long transferId) {
        InventoryTransfer transfer = transferService.getTransferById(transferId);
        return ResponseEntity.ok(transfer);
    }

    @GetMapping("/warehouse/{warehouseId}")
    @Operation(summary = "Get Transfers by Warehouse", description = "Get all transfers for a warehouse")
    public ResponseEntity<List<InventoryTransfer>> getTransfersByWarehouse(@PathVariable Long warehouseId) {
        List<InventoryTransfer> transfers = transferService.getTransfersByWarehouse(warehouseId);
        return ResponseEntity.ok(transfers);
    }
}
