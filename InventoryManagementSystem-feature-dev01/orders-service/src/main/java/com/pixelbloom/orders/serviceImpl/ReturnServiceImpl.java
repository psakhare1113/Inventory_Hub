package com.pixelbloom.orders.serviceImpl;

import com.pixelbloom.orders.enums.InspectionStatus;
import com.pixelbloom.orders.enums.DeliveryStatus;
import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.enums.ReturnStatus;
import com.pixelbloom.orders.exception.*;
import com.pixelbloom.orders.model.*;
import com.pixelbloom.orders.repository.*;
import com.pixelbloom.orders.requestEntity.InventoryInitiateReturnRequest;
import com.pixelbloom.orders.requestEntity.InventoryInspectionUpdateRequest;
import com.pixelbloom.orders.requestEntity.InventoryReleaseRequest;
import com.pixelbloom.orders.requestEntity.OrderInspectionRequest;
import com.pixelbloom.orders.requestEntity.OrderPhysicalVerificationRequest;
import com.pixelbloom.orders.responseEntity.InventoryInspectionResponse;
import com.pixelbloom.orders.responseEntity.OrderPhysicalInspectionResponse;
import com.pixelbloom.orders.responseEntity.ReturnResponse;
import com.pixelbloom.orders.restClients.InventoryClientF;
import com.pixelbloom.orders.restClients.ProductsClient;

import com.pixelbloom.orders.service.ReturnService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ReturnServiceImpl implements ReturnService {
        private final OrderRepository orderRepository;
        private final OrderItemRepository orderItemRepository;
        private final ReturnRepository returnRepository;
        private final InventoryClientF inventoryClient;
        private final ProductsClient productsClient;
        private final DeliveryAssignmentRepository deliveryAssignmentRepository;

    @Autowired
    private OrderServiceImpl orderService;

    @Override //step1
    public ReturnResponse initiateReturn(ReturnRequest request) {
       String returnReference = "return-ref-" + String.format("%04d", new Random().nextInt(10000));

        Order order = orderRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.getOrderNumber()));

        OrderItem item = orderItemRepository.findByOrderNumberAndBarcode(request.getOrderNumber(), request.getBarcode())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.getBarcode()));

        // If item-level status is not yet DELIVERED but parent order is DELIVERED,
        // sync the item status so the return window check passes (handles legacy/inconsistent data)
        if (item.getOrderStatus() != OrderStatus.DELIVERED
                && item.getOrderStatus() != OrderStatus.RETURN_INITIATED
                && item.getOrderStatus() != OrderStatus.RETURN_WINDOW_VALID
                && item.getOrderStatus() != OrderStatus.RETURN_CATEGORY_ALLOWED
                && order.getOrderStatus() == OrderStatus.DELIVERED) {
            item.setOrderStatus(OrderStatus.DELIVERED);
            if (item.getDeliveredAt() == null && order.getDeliveredAt() != null) {
                item.setDeliveredAt(order.getDeliveredAt());
            }
            orderItemRepository.save(item);
            log.info("Synced item {} status to DELIVERED from parent order {}", request.getBarcode(), request.getOrderNumber());
        }

        // Sync deliveredAt from parent order if missing on item — prevents false "window expired" error
        // when item.deliveredAt is NULL but order.deliveredAt is set
        if (item.getDeliveredAt() == null && order.getDeliveredAt() != null) {
            item.setDeliveredAt(order.getDeliveredAt());
            orderItemRepository.save(item);
            log.info("Synced deliveredAt from parent order {} to item barcode {}", request.getOrderNumber(), request.getBarcode());
        }

        validateReturnWindow(item);
        validateReturnEligibility(item);

        item.setOrderStatus(OrderStatus.RETURN_INITIATED);
        item.setReturnedInitiatedAt(LocalDateTime.now());

        orderItemRepository.save(item);

        Return returnEntity = Return.builder().returnReference(returnReference)
                .orderId(order.getId()).orderNumber(request.getOrderNumber())
                .customerId(order.getCustomerId())
                .returnReason(request.getReturnReason()).returnStatus(ReturnStatus.RETURN_INITIATED)
                .barcode(request.getBarcode())
                .returnedStartedAt(LocalDateTime.now()).build();

        returnRepository.save(returnEntity);

        // ── Auto-assign return pickup to the delivery boy who originally delivered this order ──
        // Task is created with RETURN_PICKUP_AWAITING_APPROVAL — delivery boy cannot see it yet.
        // Admin must approve the return first → task status changes to RETURN_PICKUP_PENDING.
        deliveryAssignmentRepository
            .findTopByOrderNumberOrderByAssignedAtDesc(request.getOrderNumber())
            .ifPresentOrElse(
                originalAssignment -> {
                    DeliveryAssignment returnPickupTask = DeliveryAssignment.builder()
                        .orderNumber(request.getOrderNumber())
                        .deliveryBoyId(originalAssignment.getDeliveryBoyId())
                        .deliveryBoyName(originalAssignment.getDeliveryBoyName())
                        .deliveryStatus(DeliveryStatus.RETURN_PICKUP_AWAITING_APPROVAL)
                        .isReturnPickupTask(true)
                        .returnReference(returnReference)
                        .assignedAt(LocalDateTime.now())
                        .build();
                    deliveryAssignmentRepository.save(returnPickupTask);
                    log.info("Return pickup task created (awaiting admin approval) for delivery boy {} on order {} (returnRef: {})",
                        originalAssignment.getDeliveryBoyId(), request.getOrderNumber(), returnReference);
                },
                () -> {
                    // No delivery assignment found — create unassigned task (admin will assign after approval)
                    DeliveryAssignment returnPickupTask = DeliveryAssignment.builder()
                        .orderNumber(request.getOrderNumber())
                        .deliveryBoyId(0L) // 0 = unassigned, admin must assign
                        .deliveryBoyName("Unassigned")
                        .deliveryStatus(DeliveryStatus.RETURN_PICKUP_AWAITING_APPROVAL)
                        .isReturnPickupTask(true)
                        .returnReference(returnReference)
                        .assignedAt(LocalDateTime.now())
                        .build();
                    deliveryAssignmentRepository.save(returnPickupTask);
                    log.warn("No delivery boy found for order {} — return pickup task created as unassigned, awaiting admin approval (returnRef: {})",
                        request.getOrderNumber(), returnReference);
                }
            );

        // Pass returnReference to inventory service
        inventoryClient.returnInitiated(
                InventoryInitiateReturnRequest.builder()
                        .orderNumber(request.getOrderNumber())
                        .barcode(request.getBarcode()) // Single barcode
                        .orderStatus(OrderStatus.RETURN_INITIATED)
                        .returnReference(returnReference)
                        .returnReason(request.getReturnReason())
                        .damageDeclared(request.getDamageDeclared())
                        .damageReason(request.getDamageReason())
                        .images(request.getImages())
                        .build());

        return ReturnResponse.builder()
                .returnReference(returnReference)
                .barcode(request.getBarcode())
                .inspectionId(null) // Set to null initially
                .approved(null) // Set to null initially)
                .orderNumber(request.getOrderNumber())
                .returnStatus(ReturnStatus.RETURN_INITIATED)
                .message("Return initiated successfully for " + request.getBarcode())
                .returnedStartedAt(LocalDateTime.now())
                .build();
    }

    @Override //step2
    public ReturnResponse initiatePhysicalVerification(OrderPhysicalVerificationRequest request) {

        Return returnEntity = returnRepository.findByOrderNumberAndBarcode(request.getOrderNumber(),request.getBarcode())
                .orElseThrow(() -> new ResourceNotFoundException("Return not found: " + request.getOrderNumber()));

         Order order = orderRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.getOrderNumber()));

        OrderItem item = orderItemRepository.findByOrderNumberAndBarcode(request.getOrderNumber(), request.getBarcode())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.getBarcode()));

        // Direct approval/rejection based on delivery boy input
        Boolean approved = request.getApproved() != null ? request.getApproved() : false;
        String inspectionId = "INS-" + System.currentTimeMillis();

        // Store inspection details in return entity
        returnEntity.setInspectionId(inspectionId);
        
        // Update order item status based on inspection result
        if (approved) {
            item.setOrderStatus(OrderStatus.RETURN_APPROVED);
            returnEntity.setReturnStatus(ReturnStatus.RETURN_APPROVED);
        } else {
            item.setOrderStatus(OrderStatus.RETURN_REJECTED);
            returnEntity.setReturnStatus(ReturnStatus.RETURN_REJECTED);
        }
        
        orderItemRepository.save(item);
        returnRepository.save(returnEntity);

        // Call inventory service to store inspection details (remarks, condition, images)
        try {
            inventoryClient.updateReturnInspectionDetails(
                InventoryInspectionUpdateRequest.builder()
                    .orderNumber(request.getOrderNumber())
                    .barcode(request.getBarcode())
                    .approved(approved)
                    .inspectorRemarks(request.getInspectorRemarks())
                    .itemCondition(request.getItemCondition())
                    .inspectionImages(request.getInspectionImages())
                    .inspectedBy(request.getInspectedBy() != null ? request.getInspectedBy() : "delivery-boy")
                    .build()
            );
            log.info("Inspection details stored in inventory service for order: {}, barcode: {}", 
                request.getOrderNumber(), request.getBarcode());
        } catch (Exception e) {
            log.error("Failed to store inspection details in inventory service: {}", e.getMessage());
            // Continue even if inventory service call fails - data is already in orders DB
        }

        ReturnStatus returnStatus = approved ? ReturnStatus.RETURN_APPROVED : ReturnStatus.RETURN_REJECTED;
        InspectionStatus inspectionStatus = approved ? InspectionStatus.INSPECTION_APPROVED : InspectionStatus.INSPECTION_REJECTED;

        String message = approved ? "Item approved for return" : "Item rejected: "
                + (request.getRejectionReason() != null ? request.getRejectionReason() : "Failed inspection-item found non-returnable");

        return ReturnResponse.builder()
                .returnReference(returnEntity.getReturnReference())
                .barcode(request.getBarcode())
                .inspectionId(inspectionId)
                .approved(approved)
                .orderNumber(request.getOrderNumber())
                .returnStatus(returnStatus)
                .status(inspectionStatus)
                .message(message)
                .returnedStartedAt(returnEntity.getReturnedStartedAt())
                .rejectionReason(request.getRejectionReason())
                .build();
    }


    @Override //step3
    public ReturnResponse requestReturn(ReturnRequest request) {
        Order order = orderRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.getOrderNumber()));
        Return returnEntity = returnRepository.findByOrderNumberAndBarcode(request.getOrderNumber(),request.getBarcode())
                .orElseThrow(() -> new ResourceNotFoundException("Return not found: " + request.getOrderNumber()));
        OrderItem item = orderItemRepository.findByOrderNumberAndBarcode(request.getOrderNumber(), request.getBarcode())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.getBarcode()));

        InventoryInspectionResponse inspectionResponse = validatePhysicalStatus(item, request);
        returnEntity.setInspectionId(inspectionResponse.getInspectionId());

        // Update order item status based on inspection result
        if (inspectionResponse.getStatus() == InspectionStatus.INSPECTION_APPROVED) {
            item.setOrderStatus(OrderStatus.RETURN_APPROVED);
            returnEntity.setReturnStatus(ReturnStatus.RETURN_APPROVED);
        } else if (inspectionResponse.getStatus() == InspectionStatus.INSPECTION_REJECTED) {
            item.setOrderStatus(OrderStatus.RETURN_REJECTED);
            returnEntity.setReturnStatus(ReturnStatus.RETURN_REJECTED);
        } else {
            item.setOrderStatus(getResponseStatus(inspectionResponse));
            returnEntity.setReturnStatus(mapToReturnStatus(inspectionResponse.getStatus()));
        }
        orderItemRepository.save(item);
        returnRepository.save(returnEntity);

        // Release inventory
        try {
            List<String> barcodes = new ArrayList<>();
            barcodes.add(request.getBarcode());
           inventoryClient.releaseReservation(InventoryReleaseRequest.builder()
                    .orderNumber(order.getOrderNumber()).barcodes(barcodes).build());
            log.info("Inventory released for order: {}, barcode: {}", order.getOrderNumber(), request.getBarcode());
        } catch (Exception e) {
            log.error("Inventory release failed for order: {}", order.getOrderNumber(), e);
            // Continue even if inventory release fails - can be handled manually
            //log.warn("Continuing refund despite inventory release failure");
        }

        return ReturnResponse.builder()
                .orderNumber(request.getOrderNumber())
                .barcode(request.getBarcode())
                .returnReference(returnEntity.getReturnReference())
                .returnStatus(mapToReturnStatus(inspectionResponse.getStatus()))
                .status(inspectionResponse.getStatus())  // original InspectionStatus
                .message(buildMessage(inspectionResponse))
                .approved(inspectionResponse.isApproved())
                .rejectionReason(inspectionResponse.getRejectionReason())
                .inspectionId(inspectionResponse.getInspectionId())
                .returnedStartedAt(returnEntity.getReturnedStartedAt())
                .build();
    }

    private ReturnStatus mapToReturnStatus(InspectionStatus inspectionStatus) {
        switch (inspectionStatus) {
            case INSPECTION_APPROVED:
                return ReturnStatus.RETURN_APPROVED;
            case INSPECTION_REJECTED:
                return ReturnStatus.INSPECTION_REJECTED;
            case INSPECTION_PENDING:
                return ReturnStatus.INSPECTION_PENDING;
            default:
                return ReturnStatus.INSPECTION_FAILED;
        }
    }




    private OrderStatus getResponseStatus(InventoryInspectionResponse response) {
        switch (response.getStatus()) {
            case INSPECTION_APPROVED:
                return OrderStatus.INSPECTION_APPROVED;
            case INSPECTION_PENDING:
                return OrderStatus.INSPECTION_PENDING;
            case INSPECTION_REJECTED:
                return OrderStatus.INSPECTION_REJECTED;
            default:
                return OrderStatus.INSPECTION_FAILED;
        }
    }



    private String buildMessage(InventoryInspectionResponse response) {
        if (response.isApproved()) {
            return "Item approved for return";
        } else {
            return "Item rejected: " + (response.getRejectionReason() != null
                    ? response.getRejectionReason()
                    : "Failed inspection");
        }
    }

    private InventoryInspectionResponse validatePhysicalStatus(OrderItem orderItem, ReturnRequest request) {
        if (Boolean.TRUE.equals(request.getDamageDeclared())) {
            if (request.getDamageReason() == null) {
                throw new InspectionException("Damage reason is required");
            }
            if (request.getImages() == null || request.getImages().isEmpty()) {
                throw new InspectionException("Images required for damaged items");
            }
            orderItem.setOrderStatus(OrderStatus.DAMAGE_DECLARED);
        }
        return inventoryClient.getPhysicalStatusApproval(request.getOrderNumber(),request.getBarcode());
     }


    private void validateReturnWindow(OrderItem item) {
        // Allow return if item is DELIVERED or already in a return-related status
        // (RETURN_INITIATED means return was already started — allow re-validation)
        boolean isEligibleForReturn = item.getOrderStatus() == OrderStatus.DELIVERED
                || item.getOrderStatus() == OrderStatus.RETURN_INITIATED
                || item.getOrderStatus() == OrderStatus.RETURN_WINDOW_VALID
                || item.getOrderStatus() == OrderStatus.RETURN_CATEGORY_ALLOWED;

        if (!isEligibleForReturn) {
            item.setOrderStatus(OrderStatus.RETURN_WINDOW_NOT_VALID);
            throw new ReturnWindowExpiredException("Item must be delivered before requesting return..");
        }

        // Use deliveredAt if set — NEVER fall back to createdAt (createdAt is order placement date,
        // not delivery date; using it causes all old orders to appear "expired")
        LocalDateTime deliveryDate = item.getDeliveredAt();
        if (deliveryDate == null) {
            // deliveredAt not set on item — skip window check (fail-open)
            // This handles legacy data where delivery date was not recorded
            log.warn("deliveredAt is null for item barcode {} — skipping 15-day window check (fail-open)", item.getBarcode());
            item.setOrderStatus(OrderStatus.RETURN_WINDOW_VALID);
            return;
        }

        if (deliveryDate.isBefore(LocalDateTime.now().minusDays(15))) {
            item.setOrderStatus(OrderStatus.RETURN_WINDOW_EXPIRED);
            throw new ReturnWindowExpiredException("Return window has expired. Items can only be returned within 15 days");
        }

        item.setOrderStatus(OrderStatus.RETURN_WINDOW_VALID);
    }

    private void validateReturnEligibility(OrderItem item) {
        try {
            // Call products service to check is_eligible_for_return flag
            // from imsproductsdb.products table
            Boolean isEligible = productsClient.isProductRefundEligible(
                    item.getProductId(),
                    item.getCategoryId(),
                    item.getSubcategoryId()
            );

            if (Boolean.TRUE.equals(isEligible)) {
                item.setOrderStatus(OrderStatus.RETURN_CATEGORY_ALLOWED);
                log.info("Product {} is eligible for return", item.getProductId());
            } else {
                item.setOrderStatus(OrderStatus.RETURN_CATEGORY_NOT_ALLOWED);
                throw new ReturnEligibilityException("This product is not eligible for returns.");
            }
        } catch (ReturnEligibilityException e) {
            // Re-throw eligibility exceptions directly
            throw e;
        } catch (Exception e) {
            // If products service is unavailable, log warning and allow return
            // (fail-open: don't block customer due to service unavailability)
            log.warn("Could not verify return eligibility for product {} — allowing return by default: {}",
                    item.getProductId(), e.getMessage());
            item.setOrderStatus(OrderStatus.RETURN_CATEGORY_ALLOWED);
        }
    }






}

