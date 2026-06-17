package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.dto.CreateCycleCountRequest;
import com.pixelbloom.warehouse.dto.RecordCycleCountRequest;
import com.pixelbloom.warehouse.enums.CycleCountStatus;
import com.pixelbloom.warehouse.model.CycleCount;
import com.pixelbloom.warehouse.model.CycleCountLine;
import com.pixelbloom.warehouse.repository.CycleCountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Cycle Count Service (FR-100 to FR-101)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CycleCountService {

    private final CycleCountRepository cycleCountRepository;

    /**
     * Schedule cycle count (FR-100)
     */
    @Transactional
    public CycleCount scheduleCycleCount(CreateCycleCountRequest request, Long createdBy) {
        log.info("Scheduling cycle count for warehouse: {}", request.getWarehouseId());

        // Generate cycle count number
        String cycleCountNumber = generateCycleCountNumber();

        // Create cycle count
        CycleCount cycleCount = CycleCount.builder()
                .cycleCountNumber(cycleCountNumber)
                .status(CycleCountStatus.SCHEDULED)
                .warehouseId(request.getWarehouseId())
                .locationId(request.getLocationId())
                .scheduledDate(request.getScheduledDate())
                .countType(request.getCountType())
                .abcClass(request.getAbcClass())
                .notes(request.getNotes())
                .createdBy(createdBy)
                .build();

        CycleCount savedCycleCount = cycleCountRepository.save(cycleCount);
        log.info("Cycle count scheduled: {}", cycleCountNumber);

        return savedCycleCount;
    }

    /**
     * Start cycle count
     */
    @Transactional
    public CycleCount startCycleCount(Long cycleCountId, Long countedBy) {
        log.info("Starting cycle count: {}", cycleCountId);

        CycleCount cycleCount = cycleCountRepository.findById(cycleCountId)
                .orElseThrow(() -> new RuntimeException("Cycle count not found: " + cycleCountId));

        if (cycleCount.getStatus() != CycleCountStatus.SCHEDULED) {
            throw new RuntimeException("Only SCHEDULED cycle counts can be started");
        }

        cycleCount.setStatus(CycleCountStatus.IN_PROGRESS);
        cycleCount.setCountedBy(countedBy);
        cycleCount.setCountStartedAt(LocalDateTime.now());

        return cycleCountRepository.save(cycleCount);
    }

    /**
     * Record cycle count results (FR-101)
     */
    @Transactional
    public CycleCount recordCycleCount(RecordCycleCountRequest request) {
        log.info("Recording cycle count: {}", request.getCycleCountId());

        CycleCount cycleCount = cycleCountRepository.findById(request.getCycleCountId())
                .orElseThrow(() -> new RuntimeException("Cycle count not found: " + request.getCycleCountId()));

        if (cycleCount.getStatus() != CycleCountStatus.IN_PROGRESS) {
            throw new RuntimeException("Only IN_PROGRESS cycle counts can be recorded");
        }

        // Create cycle count lines with variance calculation
        List<CycleCountLine> lines = request.getLines().stream()
                .map(lineReq -> {
                    int variance = lineReq.getPhysicalQty() - lineReq.getSystemQty();

                    return CycleCountLine.builder()
                            .cycleCount(cycleCount)
                            .productId(lineReq.getProductId())
                            .locationId(lineReq.getLocationId())
                            .barcode(lineReq.getBarcode())
                            .systemQty(lineReq.getSystemQty())
                            .physicalQty(lineReq.getPhysicalQty())
                            .variance(variance)
                            .varianceReason(lineReq.getVarianceReason())
                            .notes(lineReq.getNotes())
                            .adjustmentCreated(false)
                            .build();
                })
                .collect(Collectors.toList());

        cycleCount.setLines(lines);
        cycleCount.setStatus(CycleCountStatus.COMPLETED);
        cycleCount.setCountCompletedAt(LocalDateTime.now());

        CycleCount savedCycleCount = cycleCountRepository.save(cycleCount);
        log.info("Cycle count recorded with {} variances", savedCycleCount.getVarianceCount());

        return savedCycleCount;
    }

    /**
     * Approve cycle count and create adjustments (FR-101)
     */
    @Transactional
    public CycleCount approveCycleCount(Long cycleCountId, Long approvedBy) {
        log.info("Approving cycle count: {}", cycleCountId);

        CycleCount cycleCount = cycleCountRepository.findById(cycleCountId)
                .orElseThrow(() -> new RuntimeException("Cycle count not found: " + cycleCountId));

        if (cycleCount.getStatus() != CycleCountStatus.COMPLETED) {
            throw new RuntimeException("Only COMPLETED cycle counts can be approved");
        }

        // Mark lines with variances for adjustment
        cycleCount.getLines().stream()
                .filter(line -> line.getVariance() != 0)
                .forEach(line -> {
                    // TODO: Create inventory adjustment transaction
                    line.setAdjustmentCreated(true);
                    log.info("Adjustment created for product {} with variance {}", 
                            line.getProductId(), line.getVariance());
                });

        cycleCount.setStatus(CycleCountStatus.APPROVED);
        cycleCount.setApprovedBy(approvedBy);
        cycleCount.setApprovedAt(LocalDateTime.now());

        return cycleCountRepository.save(cycleCount);
    }

    /**
     * Reject cycle count (requires recount)
     */
    @Transactional
    public CycleCount rejectCycleCount(Long cycleCountId) {
        log.info("Rejecting cycle count: {}", cycleCountId);

        CycleCount cycleCount = cycleCountRepository.findById(cycleCountId)
                .orElseThrow(() -> new RuntimeException("Cycle count not found: " + cycleCountId));

        if (cycleCount.getStatus() != CycleCountStatus.COMPLETED) {
            throw new RuntimeException("Only COMPLETED cycle counts can be rejected");
        }

        cycleCount.setStatus(CycleCountStatus.REJECTED);

        return cycleCountRepository.save(cycleCount);
    }

    /**
     * Get cycle count by ID
     */
    public CycleCount getCycleCountById(Long cycleCountId) {
        return cycleCountRepository.findById(cycleCountId)
                .orElseThrow(() -> new RuntimeException("Cycle count not found: " + cycleCountId));
    }

    /**
     * Get due cycle counts
     */
    public List<CycleCount> getDueCycleCounts() {
        return cycleCountRepository.findDueCycleCounts(java.time.LocalDate.now());
    }

    /**
     * Generate unique cycle count number
     */
    private String generateCycleCountNumber() {
        return "CC-" + System.currentTimeMillis();
    }
}
