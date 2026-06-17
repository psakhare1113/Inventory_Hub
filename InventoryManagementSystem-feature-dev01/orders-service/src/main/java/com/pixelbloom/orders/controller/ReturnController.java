package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.enums.ReturnStatus;
import com.pixelbloom.orders.model.RefundResponse;
import com.pixelbloom.orders.model.Return;
import com.pixelbloom.orders.model.ReturnRequest;
import com.pixelbloom.orders.repository.DeliveryAssignmentRepository;
import com.pixelbloom.orders.repository.OrderItemRepository;
import com.pixelbloom.orders.repository.ReturnRepository;
import com.pixelbloom.orders.requestEntity.OrderPhysicalVerificationRequest;
import com.pixelbloom.orders.requestEntity.RefundRequest;
import com.pixelbloom.orders.responseEntity.ReturnResponse;
import com.pixelbloom.orders.service.RefundService;
import com.pixelbloom.orders.service.ReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;
    private final RefundService refundService;
    private final ReturnRepository returnRepository;
    private final OrderItemRepository orderItemRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;


    // starting point where request initiated and call to inventory-service to chaneg status = RETURN_INITIATED to be in synch with order & orderItem
    @PostMapping("/order-return-initiated-step1")
    public ResponseEntity<ReturnResponse> returnOrderInitiated(@RequestBody ReturnRequest request) {
        ReturnResponse response = returnService.initiateReturn(request);
        return ResponseEntity.ok(response);
    }

    // here delivery boy will pickup item and scan it and verify the return is good or damaged this will make entry inside inventory
    @PostMapping("/order-return-initiate-physical-verification-step2")
    public ResponseEntity<ReturnResponse> returnOrderPhysicalVerification(@RequestBody OrderPhysicalVerificationRequest request) {
        ReturnResponse response = returnService.initiatePhysicalVerification(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/order-return-finalStep3")
    public ResponseEntity<ReturnResponse> returnOrder(@RequestBody ReturnRequest request) {
        ReturnResponse response = returnService.requestReturn(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/doRefund")
    public ResponseEntity<RefundResponse> doRefund(@RequestBody RefundRequest request) {
        RefundResponse response = refundService.refund(request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/orders/return-status?orderNumber=...&barcode=...
     * Returns the current return status for a specific order item.
     * Called by the frontend OrderHistory component to display return badges.
     */
    @GetMapping("/return-status")
    public ResponseEntity<?> getReturnStatus(
            @RequestParam String orderNumber,
            @RequestParam String barcode) {
        
        // Get return record
        Optional<Return> returnOpt = returnRepository.findByOrderNumberAndBarcode(orderNumber, barcode);
        if (returnOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("returnStatus", ""));
        }
        
        Return ret = returnOpt.get();
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("orderNumber", ret.getOrderNumber());
        response.put("barcode", ret.getBarcode());
        response.put("returnStatus", ret.getReturnStatus().name());
        response.put("returnReference", ret.getReturnReference() != null ? ret.getReturnReference() : "");
        response.put("returnReason", ret.getReturnReason() != null ? ret.getReturnReason() : "");
        response.put("returnedStartedAt", ret.getReturnedStartedAt() != null ? ret.getReturnedStartedAt().toString() : "");
        
        // Also include orderItem status so frontend can check if refund is completed
        try {
            orderItemRepository.findByOrderNumberAndBarcode(orderNumber, barcode)
                .ifPresent(item -> response.put("orderItemStatus", item.getOrderStatus().name()));
        } catch (Exception e) {
            // If orderItem not found, continue without it
        }

        // Include delivery boy name from the return pickup task so user can see who is coming
        try {
            deliveryAssignmentRepository
                .findByReturnReferenceAndIsReturnPickupTaskTrue(ret.getReturnReference())
                .ifPresent(task -> {
                    response.put("deliveryBoyName",
                        (task.getDeliveryBoyId() != null && task.getDeliveryBoyId() == 0L)
                            ? "Unassigned"
                            : (task.getDeliveryBoyName() != null ? task.getDeliveryBoyName() : ""));
                    response.put("returnPickupStatus", task.getDeliveryStatus().name());
                });
        } catch (Exception e) {
            // Non-critical — continue without pickup task info
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/orders/return-requests
     * Returns all pending return requests with status = RETURN_INITIATED.
     * Called by the Delivery Boy Dashboard to show pickup tasks.
     */
    @GetMapping("/return-requests")
    public ResponseEntity<List<Map<String, Object>>> getPendingReturnRequests() {
        List<Return> pending = returnRepository.findByReturnStatus(ReturnStatus.RETURN_INITIATED);

        List<Map<String, Object>> result = pending.stream().map(ret -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("orderNumber",       ret.getOrderNumber());
            map.put("barcode",           ret.getBarcode() != null ? ret.getBarcode() : "");
            map.put("returnReference",   ret.getReturnReference() != null ? ret.getReturnReference() : "");
            map.put("returnStatus",      ret.getReturnStatus().name());
            map.put("returnReason",      ret.getReturnReason() != null ? ret.getReturnReason() : "");
            map.put("customerId",        ret.getCustomerId() != null ? ret.getCustomerId() : 0L);
            map.put("returnedStartedAt", ret.getReturnedStartedAt() != null ? ret.getReturnedStartedAt().toString() : "");
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/orders/return-stats
     * Returns statistics for delivery boy dashboard.
     * Shows counts of approved and rejected returns.
     */
    @GetMapping("/return-stats")
    public ResponseEntity<Map<String, Object>> getReturnStats() {
        long approvedCount = returnRepository.findByReturnStatus(ReturnStatus.RETURN_APPROVED).size();
        long rejectedCount = returnRepository.findByReturnStatus(ReturnStatus.RETURN_REJECTED).size();
        long pendingCount = returnRepository.findByReturnStatus(ReturnStatus.RETURN_INITIATED).size();

        Map<String, Object> stats = new HashMap<>();
        stats.put("approvedToday", approvedCount);
        stats.put("rejectedToday", rejectedCount);
        stats.put("pendingPickup", pendingCount);

        return ResponseEntity.ok(stats);
    }
}