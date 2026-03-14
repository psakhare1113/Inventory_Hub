package com.pixelbloom.orders.serviceImpl;

import com.pixelbloom.orders.enums.InspectionStatus;
import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.enums.ReturnStatus;
import com.pixelbloom.orders.exception.*;
import com.pixelbloom.orders.model.*;
import com.pixelbloom.orders.repository.*;
import com.pixelbloom.orders.requestEntity.InventoryInitiateReturnRequest;
import com.pixelbloom.orders.requestEntity.InventoryReleaseRequest;
import com.pixelbloom.orders.requestEntity.OrderInspectionRequest;
import com.pixelbloom.orders.requestEntity.OrderPhysicalVerificationRequest;
import com.pixelbloom.orders.responseEntity.InventoryInspectionResponse;
import com.pixelbloom.orders.responseEntity.OrderPhysicalInspectionResponse;
import com.pixelbloom.orders.responseEntity.ReturnResponse;
import com.pixelbloom.orders.restClients.InventoryClientF;

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

    @Autowired
    private OrderServiceImpl orderService;

    @Override //step1
    public ReturnResponse initiateReturn(ReturnRequest request) {
       String returnReference = "return-ref-" + String.format("%04d", new Random().nextInt(10000));

        Order order = orderRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.getOrderNumber()));

        OrderItem item = orderItemRepository.findByOrderNumberAndBarcode(request.getOrderNumber(), request.getBarcode())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + request.getBarcode()));

        validateReturnWindow(item);
        validateReturnEligibility(item);

        item.setOrderStatus(OrderStatus.RETURN_INITIATED);
        item.setReturnedInitiatedAt(LocalDateTime.now());

        orderItemRepository.save(item);

        Return returnEntity = Return.builder().returnReference(returnReference)
                .orderId(order.getId()).orderNumber(request.getOrderNumber())
                .returnReason(request.getReturnReason()).returnStatus(ReturnStatus.RETURN_INITIATED)
                .barcode(request.getBarcode())
                .returnedStartedAt(LocalDateTime.now()).build();

        returnRepository.save(returnEntity);


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

        // Call inventory service for physical inspection
        OrderPhysicalInspectionResponse response = inventoryClient.getPhysicalVerificationDone(request);

        // Update order item status based on inspection result
        if (response.getApproved()) {
            item.setOrderStatus(OrderStatus.RETURN_APPROVED);
            returnEntity.setReturnStatus(ReturnStatus.RETURN_APPROVED);
        } else {
            item.setOrderStatus(OrderStatus.RETURN_REJECTED);
            returnEntity.setReturnStatus(ReturnStatus.RETURN_REJECTED);
        }
        orderItemRepository.save(item);

        ReturnStatus returnStatus = response.getApproved()? ReturnStatus.RETURN_APPROVED: ReturnStatus.RETURN_REJECTED;


        InspectionStatus inspectionStatus = response.getApproved()? InspectionStatus.INSPECTION_APPROVED: InspectionStatus.INSPECTION_REJECTED;

        String message = response.getApproved()? "Item approved for return": "Item rejected: "
                + (request.getRejectionReason() != null ? request.getRejectionReason() : "Failed inspection-item found non-returnable");

        return ReturnResponse.builder()
                .returnReference(returnEntity.getReturnReference())
                .barcode(request.getBarcode())
                .inspectionId(response.getInspectionId())
                .approved(response.getApproved())
                .orderNumber(request.getOrderNumber())
                .returnStatus(returnStatus)
                .status(inspectionStatus)
                .message(message)
                .returnedStartedAt(returnEntity.getReturnedStartedAt()) // want to set this date from Return Entity
                .rejectionReason(response.getRejectionReason())
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
        if (item.getOrderStatus() != OrderStatus.DELIVERED) {
            item.setOrderStatus(OrderStatus.RETURN_WINDOW_NOT_VALID);
            throw new ReturnWindowExpiredException("Item must be delivered before requesting return..");
        }

        LocalDateTime deliveryDate = item.getDeliveredAt() != null ? item.getDeliveredAt() : item.getCreatedAt();
        if (deliveryDate.isBefore(LocalDateTime.now().minusDays(15))) {
            item.setOrderStatus(OrderStatus.RETURN_WINDOW_EXPIRED);
            throw new ReturnWindowExpiredException("Return window has expired. Items can only be returned within 15 days");
        }

        item.setOrderStatus(OrderStatus.RETURN_WINDOW_VALID);
    }

    private void validateReturnEligibility(OrderItem item) {
        try {
            //boolean isEligible = productClient.isProductRefundEligible(item.getProductId(), item.getCategoryId(), item.getSubcategoryId());
            boolean isEligible =true;
            if (isEligible) {
                item.setOrderStatus(OrderStatus.RETURN_CATEGORY_ALLOWED);
            } else {
                item.setOrderStatus(OrderStatus.RETURN_CATEGORY_NOT_ALLOWED);
                throw new ReturnEligibilityException("This product category is not eligible for returns");
            }
        } catch (Exception e) {
            item.setOrderStatus(OrderStatus.RETURN_CATEGORY_NOT_ALLOWED);
            throw new ReturnEligibilityException("Unable to verify product return eligibility. Please try again later");
        }
    }






}

