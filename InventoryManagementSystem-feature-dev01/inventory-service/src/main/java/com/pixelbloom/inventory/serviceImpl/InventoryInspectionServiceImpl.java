package com.pixelbloom.inventory.serviceImpl;

import com.pixelbloom.inventory.enums.*;
import com.pixelbloom.inventory.exception.BusinessException;
import com.pixelbloom.inventory.model.*;
import com.pixelbloom.inventory.repository.*;
import com.pixelbloom.inventory.requestEntity.InspectionRequestDto;
import com.pixelbloom.inventory.requestEntity.InspectionResponse;
import com.pixelbloom.inventory.requestEntity.InventoryInspectionRequest;
import com.pixelbloom.inventory.requestEntity.orderInspectionRequest;
import com.pixelbloom.inventory.service.InventoryInspectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class InventoryInspectionServiceImpl implements InventoryInspectionService {

    private final InventoryRepository inventoryRepository;
    private final ReturnRepository returnRepository;
    private final InventoryInspectionRepository inspectionRepository;
    private final InventoryInspectionItemRepository inspectionItemRepository;
    private final InventoryReservationRepository inventoryReservationRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;

    @Override
    @Transactional
    public InspectionResponse completeInspection(InventoryInspectionRequest request) {
        // Validate single barcode
        if (request.getBarcode() == null || request.getBarcode().isEmpty()) {
            throw new BusinessException("Barcode must be provided for inspection");
        }

        if (request.getApproved() == null) {
            throw new BusinessException("Approval status must be provided");
        }

        String barcode = request.getBarcode();
        Boolean approved = request.getApproved();

        // Check if already inspected
        List<InventoryInspectionItem> existingItems = inspectionItemRepository
                .findLatestByOrderAndBarcodes(request.getOrderNumber(),request.getBarcode());

        if (!existingItems.isEmpty()) {
            InventoryInspectionItem existingItem = existingItems.get(0);
            InventoryInspection existingInspection = existingItem.getInspection();
            boolean isApproved = existingItem.getResult() == InspectionResult.INSPECTION_APPROVED;

            log.warn("Inspection already processed for barcode: {}", barcode);

            return InspectionResponse.builder()
                    .inspectionId(existingInspection.getInspectionId())
                    .orderNumber(existingInspection.getOrderNumber())
                    .status(existingInspection.getStatus())
                    .barcode(existingItem.getBarcode())
                    .approved(isApproved)
                    .inspectedAt(existingInspection.getInspectedAt())
                    .message("Inspection already completed")
                    .build();
        }

        String inspectionId = UUID.randomUUID().toString();
        LocalDateTime inspectedAt = LocalDateTime.now();

        // Create parent inspection record
        InventoryInspection inspection = InventoryInspection.builder()
                .inspectionId(inspectionId)
                .orderNumber(request.getOrderNumber())
                .inspectedBy(request.getInspectedBy())
                .inspectorRemarks(request.getInspectorRemarks())
                .inspectedAt(inspectedAt)
                .createdAt(LocalDateTime.now())
                .build();

        Inventory inventory = inventoryRepository.findByBarcode(barcode)
                .orElseThrow(() -> new BusinessException("Inventory not found: " + barcode));

        // Validate inventory state
        if (inventory.getInventoryStatus() != InventoryStatus.INSPECTION_REQUESTED
                && inventory.getInventoryStatus() != InventoryStatus.RETURN_INITIATED
                && inventory.getInventoryStatus() != InventoryStatus.REFUND_REQUESTED) {
            throw new BusinessException(
                    "Inspection not allowed for barcode=" + barcode +
                            ". Current status=" + inventory.getInventoryStatus()
            );
        }

        InspectionResult itemResult;
        ReturnStatus returnStatus;
        InspectionStatus inspectionStatus;

        if (Boolean.TRUE.equals(approved)) {
            itemResult = InspectionResult.INSPECTION_APPROVED;
            returnStatus = ReturnStatus.RETURN_APPROVED;
            inspectionStatus = InspectionStatus.INSPECTION_APPROVED;
            inventory.setInventoryStatus(InventoryStatus.INSPECTION_APPROVED);
            //make it available again to other customers
            inventory.setInventoryStatus(InventoryStatus.AVAILABLE);
        } else {
            itemResult = InspectionResult.INSPECTION_REJECTED;
            returnStatus = ReturnStatus.RETURN_REJECTED;
            inspectionStatus = InspectionStatus.INSPECTION_REJECTED;
            inventory.setInventoryStatus(InventoryStatus.INSPECTION_REJECTED);
          //mark it as it in Sold item
            inventory.setInventoryStatus(InventoryStatus.SALE);

        }

        inventory.setUpdatedAt(LocalDateTime.now());
        inventoryRepository.save(inventory);

        inspection.setStatus(inspectionStatus);
        inspectionRepository.save(inspection);

        // Create/Update return record
        InventoryReturn returnRecord = returnRepository
                .findByOrderNumberAndBarcode(request.getOrderNumber(), barcode)
                .orElse(InventoryReturn.builder()
                        .orderNumber(request.getOrderNumber())
                        .barcode(barcode)
                        .createdAt(LocalDateTime.now())
                        .build());

        returnRecord.setInspection(inspection);
        returnRecord.setApproved(Boolean.TRUE.equals(approved));
        returnRecord.setStatus(returnStatus);
        returnRecord.setRejectionReason(request.getRejectionReason());
        returnRecord.setReturnReference(
                returnRecord.getReturnReference() != null
                        ? returnRecord.getReturnReference()
                        : request.getReturnReference()
        );
        returnRecord.setInspectedAt(inspectedAt);
        returnRecord.setInspectedBy(request.getInspectedBy());
        returnRecord.setUpdatedAt(LocalDateTime.now());

        returnRepository.save(returnRecord);

        // Update transaction record
        inventoryTransactionRepository.updateReturnStatusByInventoryId(
                inventory.getId(),
                returnStatus,
                returnRecord.getId());

        // Create inspection item
        InventoryInspectionItem inspectionItem = InventoryInspectionItem.builder()
                .inspection(inspection)
                .orderNumber(request.getOrderNumber())
                .barcode(barcode)
                .result(itemResult)
                .rejectionReason(request.getRejectionReason())
                .updatedAt(LocalDateTime.now())
                .build();

        inspectionItemRepository.save(inspectionItem);

        log.info("Inspection {} completed for barcode {}: {}", inspectionId, barcode, itemResult);

        return InspectionResponse.builder()
                .inspectionId(inspectionId)
                .orderNumber(request.getOrderNumber())
                .status(inspectionStatus)
                .barcode(barcode)
                .approved(approved)
                .inspectedAt(inspectedAt)
                .message("Inspection completed successfully")
                .build();
    }


    @Override
    @Transactional(readOnly = true)
    public InspectionResponse getInspection(InspectionRequestDto request) {
        List<InventoryInspectionItem> items = inspectionItemRepository
                .findLatestByOrderAndBarcodes(request.getOrderNumber(), request.getBarcode());

        if (items.isEmpty()) {
            throw new BusinessException("No inspection found for order=" + request.getOrderNumber() + ", barcode=" + request.getBarcode());
        }

        InventoryInspectionItem item = items.get(0);
        InventoryInspection inspection = item.getInspection();

        boolean approved = item.getResult() == InspectionResult.INSPECTION_APPROVED;

        return InspectionResponse.builder()
                .orderNumber(inspection.getOrderNumber())
                .inspectionId(inspection.getInspectionId())
                .barcode(request.getBarcode())
                .approved(approved)
                .status(inspection.getStatus())
                .rejectionReason(item.getRejectionReason())
                .inspectedAt(inspection.getInspectedAt())
                .message("Inspection retrieved successfully")
                .build();
    }

    @Override
    @Transactional
    public SuccessResponseDTO orderReturnInitiated(orderInspectionRequest request) {
        String barcode = request.getBarcode();
        String orderNumber = request.getOrderNumber();
        String returnReference = request.getReturnReference();
        LocalDateTime orderReturnedInitiatedAt = LocalDateTime.now();

        if (barcode == null || barcode.isEmpty()) {
            throw new BusinessException("Barcode is required");
        }

        Inventory inventory = inventoryRepository.findByBarcode(barcode)
                .orElseThrow(() -> new BusinessException("Inventory not found: " + barcode));

        if (inventory.getInventoryStatus() != InventoryStatus.SALE) {
            throw new BusinessException("Invalid inventory status for return. Expected SALE, found: " + inventory.getInventoryStatus());
        }

        inventory.setInventoryStatus(InventoryStatus.RETURN_INITIATED);
        inventory.setOrderReturnedInitiatedAt(orderReturnedInitiatedAt);
        inventoryRepository.save(inventory);

        InventoryReturn returnRecord = InventoryReturn.builder()
                .orderNumber(orderNumber)
                .barcode(barcode)
                .returnReference(returnReference)
                .status(ReturnStatus.RETURN_INITIATED)
                .approved(false)
                .returnReason(request.getReturnReason())
                .damageDeclared(request.getDamageDeclared())
                .damageReason(request.getDamageReason())
                .images(request.getImages())
                .createdAt(LocalDateTime.now())
                .build();
        returnRepository.save(returnRecord);

        inventoryReservationRepository.updateStatusByOrderNumberAndBarcode(
                orderNumber, barcode, ReservationStatus.RETURN_INITIATED);

        inventoryTransactionRepository.updateReturnReferenceByInventoryId(
                inventory.getId(), returnReference);

        inventoryTransactionRepository.updateReturnStatusByInventoryId(
                inventory.getId(), ReturnStatus.RETURN_INITIATED, returnRecord.getId());

        return new SuccessResponseDTO(orderNumber, "Return initiated successfully for " + barcode);
    }

}
