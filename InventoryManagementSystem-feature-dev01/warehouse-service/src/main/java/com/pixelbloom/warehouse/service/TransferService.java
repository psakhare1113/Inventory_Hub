package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.dto.CreateTransferRequest;
import com.pixelbloom.warehouse.enums.TransferStatus;
import com.pixelbloom.warehouse.model.InventoryTransfer;
import com.pixelbloom.warehouse.model.TransferLine;
import com.pixelbloom.warehouse.repository.InventoryTransferRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Inventory Transfer Service (FR-80)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransferService {

    private final InventoryTransferRepository transferRepository;

    /**
     * Create transfer request (FR-80)
     */
    @Transactional
    public InventoryTransfer createTransfer(CreateTransferRequest request, Long requestedBy) {
        log.info("Creating transfer from warehouse {} to {}", 
                request.getSourceWarehouseId(), request.getDestinationWarehouseId());

        // Generate transfer number
        String transferNumber = generateTransferNumber();

        // Create transfer
        InventoryTransfer transfer = InventoryTransfer.builder()
                .transferNumber(transferNumber)
                .status(TransferStatus.REQUESTED)
                .sourceWarehouseId(request.getSourceWarehouseId())
                .sourceLocationId(request.getSourceLocationId())
                .destinationWarehouseId(request.getDestinationWarehouseId())
                .destinationLocationId(request.getDestinationLocationId())
                .transferType(request.getTransferType())
                .reason(request.getReason())
                .notes(request.getNotes())
                .requestedBy(requestedBy)
                .requestedAt(LocalDateTime.now())
                .build();

        // Create transfer lines
        List<TransferLine> lines = request.getLines().stream()
                .map(lineReq -> TransferLine.builder()
                        .transfer(transfer)
                        .productId(lineReq.getProductId())
                        .qtyTransferred(lineReq.getQtyTransferred())
                        .qtyReceived(0)
                        .barcode(lineReq.getBarcode())
                        .lotNumber(lineReq.getLotNumber())
                        .notes(lineReq.getNotes())
                        .build())
                .collect(Collectors.toList());

        transfer.setLines(lines);

        InventoryTransfer savedTransfer = transferRepository.save(transfer);
        log.info("Transfer created: {}", transferNumber);

        return savedTransfer;
    }

    /**
     * Approve transfer
     */
    @Transactional
    public InventoryTransfer approveTransfer(Long transferId, Long approvedBy) {
        log.info("Approving transfer: {}", transferId);

        InventoryTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new RuntimeException("Transfer not found: " + transferId));

        if (transfer.getStatus() != TransferStatus.REQUESTED) {
            throw new RuntimeException("Only REQUESTED transfers can be approved");
        }

        transfer.setStatus(TransferStatus.APPROVED);
        transfer.setApprovedBy(approvedBy);
        transfer.setApprovedAt(LocalDateTime.now());

        return transferRepository.save(transfer);
    }

    /**
     * Mark transfer as picked (in transit)
     */
    @Transactional
    public InventoryTransfer markAsPicked(Long transferId, Long pickedBy) {
        log.info("Marking transfer as picked: {}", transferId);

        InventoryTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new RuntimeException("Transfer not found: " + transferId));

        if (transfer.getStatus() != TransferStatus.APPROVED) {
            throw new RuntimeException("Only APPROVED transfers can be picked");
        }

        transfer.setStatus(TransferStatus.IN_TRANSIT);
        transfer.setPickedBy(pickedBy);
        transfer.setPickedAt(LocalDateTime.now());

        return transferRepository.save(transfer);
    }

    /**
     * Receive transfer at destination
     */
    @Transactional
    public InventoryTransfer receiveTransfer(Long transferId, Long receivedBy) {
        log.info("Receiving transfer: {}", transferId);

        InventoryTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new RuntimeException("Transfer not found: " + transferId));

        if (transfer.getStatus() != TransferStatus.IN_TRANSIT) {
            throw new RuntimeException("Only IN_TRANSIT transfers can be received");
        }

        // Mark all lines as received (full quantity)
        transfer.getLines().forEach(line -> line.setQtyReceived(line.getQtyTransferred()));

        transfer.setStatus(TransferStatus.RECEIVED);
        transfer.setReceivedBy(receivedBy);
        transfer.setReceivedAt(LocalDateTime.now());

        return transferRepository.save(transfer);
    }

    /**
     * Complete transfer (inventory updated)
     */
    @Transactional
    public InventoryTransfer completeTransfer(Long transferId) {
        log.info("Completing transfer: {}", transferId);

        InventoryTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new RuntimeException("Transfer not found: " + transferId));

        if (transfer.getStatus() != TransferStatus.RECEIVED) {
            throw new RuntimeException("Only RECEIVED transfers can be completed");
        }

        if (!transfer.isFullyReceived()) {
            throw new RuntimeException("All lines must be fully received before completion");
        }

        transfer.setStatus(TransferStatus.COMPLETED);

        return transferRepository.save(transfer);
    }

    /**
     * Cancel transfer
     */
    @Transactional
    public InventoryTransfer cancelTransfer(Long transferId) {
        log.info("Cancelling transfer: {}", transferId);

        InventoryTransfer transfer = transferRepository.findById(transferId)
                .orElseThrow(() -> new RuntimeException("Transfer not found: " + transferId));

        if (transfer.getStatus() == TransferStatus.COMPLETED) {
            throw new RuntimeException("Cannot cancel completed transfer");
        }

        transfer.setStatus(TransferStatus.CANCELLED);

        return transferRepository.save(transfer);
    }

    /**
     * Get transfer by ID
     */
    public InventoryTransfer getTransferById(Long transferId) {
        return transferRepository.findById(transferId)
                .orElseThrow(() -> new RuntimeException("Transfer not found: " + transferId));
    }

    /**
     * Get transfers by warehouse
     */
    public List<InventoryTransfer> getTransfersByWarehouse(Long warehouseId) {
        return transferRepository.findByWarehouseId(warehouseId);
    }

    /**
     * Generate unique transfer number
     */
    private String generateTransferNumber() {
        return "TRF-" + System.currentTimeMillis();
    }
}
