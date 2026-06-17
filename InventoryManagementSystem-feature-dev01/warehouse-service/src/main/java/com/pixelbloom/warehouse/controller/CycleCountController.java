package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.dto.CreateCycleCountRequest;
import com.pixelbloom.warehouse.dto.RecordCycleCountRequest;
import com.pixelbloom.warehouse.model.CycleCount;
import com.pixelbloom.warehouse.service.CycleCountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouse/cycle-counts")
@RequiredArgsConstructor
@Tag(name = "Cycle Counts", description = "Cycle Count Management APIs")
public class CycleCountController {

    private final CycleCountService cycleCountService;

    @PostMapping
    @Operation(summary = "Schedule Cycle Count", description = "Schedule a new cycle count (FR-100)")
    public ResponseEntity<CycleCount> scheduleCycleCount(
            @Valid @RequestBody CreateCycleCountRequest request,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        
        CycleCount cycleCount = cycleCountService.scheduleCycleCount(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(cycleCount);
    }

    @PutMapping("/{cycleCountId}/start")
    @Operation(summary = "Start Cycle Count", description = "Start cycle count execution")
    public ResponseEntity<CycleCount> startCycleCount(
            @PathVariable Long cycleCountId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        
        CycleCount cycleCount = cycleCountService.startCycleCount(cycleCountId, userId);
        return ResponseEntity.ok(cycleCount);
    }

    @PostMapping("/record")
    @Operation(summary = "Record Cycle Count", description = "Record cycle count results with variances (FR-101)")
    public ResponseEntity<CycleCount> recordCycleCount(@Valid @RequestBody RecordCycleCountRequest request) {
        CycleCount cycleCount = cycleCountService.recordCycleCount(request);
        return ResponseEntity.ok(cycleCount);
    }

    @PutMapping("/{cycleCountId}/approve")
    @Operation(summary = "Approve Cycle Count", description = "Approve cycle count and create adjustments (FR-101)")
    public ResponseEntity<CycleCount> approveCycleCount(
            @PathVariable Long cycleCountId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        
        CycleCount cycleCount = cycleCountService.approveCycleCount(cycleCountId, userId);
        return ResponseEntity.ok(cycleCount);
    }

    @PutMapping("/{cycleCountId}/reject")
    @Operation(summary = "Reject Cycle Count", description = "Reject cycle count (requires recount)")
    public ResponseEntity<CycleCount> rejectCycleCount(@PathVariable Long cycleCountId) {
        CycleCount cycleCount = cycleCountService.rejectCycleCount(cycleCountId);
        return ResponseEntity.ok(cycleCount);
    }

    @GetMapping("/{cycleCountId}")
    @Operation(summary = "Get Cycle Count", description = "Get cycle count by ID")
    public ResponseEntity<CycleCount> getCycleCount(@PathVariable Long cycleCountId) {
        CycleCount cycleCount = cycleCountService.getCycleCountById(cycleCountId);
        return ResponseEntity.ok(cycleCount);
    }

    @GetMapping("/due")
    @Operation(summary = "Get Due Cycle Counts", description = "Get all due cycle counts")
    public ResponseEntity<List<CycleCount>> getDueCycleCounts() {
        List<CycleCount> cycleCounts = cycleCountService.getDueCycleCounts();
        return ResponseEntity.ok(cycleCounts);
    }
}
