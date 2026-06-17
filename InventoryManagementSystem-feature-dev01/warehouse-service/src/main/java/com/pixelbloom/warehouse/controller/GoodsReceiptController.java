package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.dto.CreateGRNRequest;
import com.pixelbloom.warehouse.model.GoodsReceiptNote;
import com.pixelbloom.warehouse.service.GoodsReceiptService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouse/grn")
@RequiredArgsConstructor
@Tag(name = "Goods Receipt", description = "Goods Receipt Note (GRN) Management APIs")
public class GoodsReceiptController {

    private final GoodsReceiptService grnService;

    @PostMapping
    @Operation(summary = "Create GRN", description = "Create goods receipt note from PO (FR-30, FR-31)")
    public ResponseEntity<GoodsReceiptNote> createGRN(
            @Valid @RequestBody CreateGRNRequest request,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        
        GoodsReceiptNote grn = grnService.createGRN(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(grn);
    }

    @PutMapping("/{grnId}/inspect")
    @Operation(summary = "Complete Inspection", description = "Complete quality inspection for GRN (FR-31)")
    public ResponseEntity<GoodsReceiptNote> completeInspection(
            @PathVariable Long grnId,
            @RequestParam String notes,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        
        GoodsReceiptNote grn = grnService.completeInspection(grnId, userId, notes);
        return ResponseEntity.ok(grn);
    }

    @PutMapping("/{grnId}/putaway/{lineId}")
    @Operation(summary = "Complete Putaway", description = "Complete putaway for GRN line (FR-33)")
    public ResponseEntity<Void> completePutaway(
            @PathVariable Long grnId,
            @PathVariable Long lineId,
            @RequestParam Long actualLocationId) {
        
        grnService.completePutaway(grnId, lineId, actualLocationId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{grnId}")
    @Operation(summary = "Get GRN", description = "Get GRN by ID")
    public ResponseEntity<GoodsReceiptNote> getGRN(@PathVariable Long grnId) {
        GoodsReceiptNote grn = grnService.getGRNById(grnId);
        return ResponseEntity.ok(grn);
    }

    @GetMapping("/pending-putaway")
    @Operation(summary = "Get Pending Putaway", description = "Get all GRNs pending putaway")
    public ResponseEntity<List<GoodsReceiptNote>> getPendingPutaway() {
        List<GoodsReceiptNote> grns = grnService.getPendingPutawayGRNs();
        return ResponseEntity.ok(grns);
    }

    @GetMapping
    @Operation(summary = "Get All GRNs", description = "Get all GRNs")
    public ResponseEntity<List<GoodsReceiptNote>> getAllGRNs() {
        List<GoodsReceiptNote> grns = grnService.getAllGRNs();
        return ResponseEntity.ok(grns);
    }
}
