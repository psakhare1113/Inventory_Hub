package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.enums.DeliveryStatus;
import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.model.CustomerDetails;
import com.pixelbloom.orders.model.DeliveryAssignment;
import com.pixelbloom.orders.model.Order;
import com.pixelbloom.orders.model.Return;
import com.pixelbloom.orders.repository.DeliveryAssignmentRepository;
import com.pixelbloom.orders.repository.OrderItemRepository;
import com.pixelbloom.orders.repository.OrderRepository;
import com.pixelbloom.orders.repository.ReturnRepository;
import com.pixelbloom.orders.service.CustomerdetailsService;
import com.pixelbloom.orders.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DeliveryController — all delivery-boy and delivery-assignment endpoints.
 *
 * Delivery Boy endpoints  → /api/auth/delivery/**
 * Admin assignment endpoints → /api/auth/admin/delivery/**
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class DeliveryController {

    private final DeliveryAssignmentRepository assignmentRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ReturnRepository returnRepository;
    private final OrderService orderService;
    private final CustomerdetailsService customerdetailsService;

    // ─────────────────────────────────────────────────────────────────────────
    // DELIVERY BOY — read orders
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/auth/delivery/my-orders
     * Returns SHIPPED orders assigned to this delivery boy.
     * deliveryBoyId passed as query param (extracted from JWT by frontend).
     */
    @GetMapping("/api/auth/delivery/my-orders")
    public ResponseEntity<?> getMyAssignedOrders(
            @RequestParam(required = false) Long deliveryBoyId) {
        if (deliveryBoyId != null) {
            List<DeliveryAssignment> assignments =
                assignmentRepository.findByDeliveryBoyIdAndDeliveryStatus(deliveryBoyId, DeliveryStatus.ASSIGNED);
            return ResponseEntity.ok(enrichAssignments(assignments));
        }
        // Fallback: return all SHIPPED orders (backward compat)
        return ResponseEntity.ok(
            orderRepository.findAll().stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.SHIPPED)
                .toList()
        );
    }

    /**
     * GET /api/auth/delivery/out-for-delivery
     * Returns orders currently out for delivery.
     */
    @GetMapping("/api/auth/delivery/out-for-delivery")
    public ResponseEntity<?> getOutForDeliveryOrders(
            @RequestParam(required = false) Long deliveryBoyId) {
        if (deliveryBoyId != null) {
            List<DeliveryAssignment> assignments =
                assignmentRepository.findByDeliveryBoyIdAndDeliveryStatus(deliveryBoyId, DeliveryStatus.OUT_FOR_DELIVERY);
            return ResponseEntity.ok(enrichAssignments(assignments));
        }
        return ResponseEntity.ok(
            orderRepository.findAll().stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.OUT_FOR_DELIVERY)
                .toList()
        );
    }

    /**
     * GET /api/auth/delivery/delivered
     * Returns orders delivered by this delivery boy.
     */
    @GetMapping("/api/auth/delivery/delivered")
    public ResponseEntity<?> getDeliveredOrders(
            @RequestParam(required = false) Long deliveryBoyId) {
        if (deliveryBoyId != null) {
            List<DeliveryAssignment> assignments =
                assignmentRepository.findByDeliveryBoyIdAndDeliveryStatus(deliveryBoyId, DeliveryStatus.DELIVERED);
            return ResponseEntity.ok(enrichAssignments(assignments));
        }
        return ResponseEntity.ok(
            orderRepository.findAll().stream()
                .filter(o -> o.getOrderStatus() == OrderStatus.DELIVERED)
                .toList()
        );
    }

    /**
     * Enrich DeliveryAssignment list with order details (totalAmount, paymentMode, shippingAddress etc.)
     * so the delivery dashboard can display them without a second API call.
     */
    private List<Map<String, Object>> enrichAssignments(List<DeliveryAssignment> assignments) {
        return assignments.stream().map(a -> {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            // Assignment fields
            map.put("id",               a.getId());
            map.put("orderNumber",      a.getOrderNumber());
            map.put("deliveryBoyId",    a.getDeliveryBoyId());
            map.put("deliveryBoyName",  a.getDeliveryBoyName());
            map.put("deliveryStatus",   a.getDeliveryStatus());
            map.put("assignedAt",       a.getAssignedAt());
            map.put("pickedUpAt",       a.getPickedUpAt());
            map.put("deliveredAt",      a.getDeliveredAt());
            map.put("deliveryRemarks",  a.getDeliveryRemarks());
            map.put("cashCollected",    a.getCashCollected());
            map.put("amountCollected",  a.getAmountCollected());
            // Map deliveryStatus → orderStatus so frontend works without changes
            String orderStatus = switch (a.getDeliveryStatus()) {
                case ASSIGNED         -> "SHIPPED";
                case OUT_FOR_DELIVERY -> "OUT_FOR_DELIVERY";
                case DELIVERED        -> "DELIVERED";
                default               -> a.getDeliveryStatus().name();
            };
            map.put("orderStatus", orderStatus);
            // Enrich with order details
            orderRepository.findByOrderNumber(a.getOrderNumber()).ifPresent(order -> {
                map.put("totalAmount",      order.getTotalAmount());
                map.put("paymentMode",      order.getPaymentMode());
                map.put("paymentStatus",    order.getPaymentStatus());
                map.put("customerId",       order.getCustomerId());
                map.put("awbNumber",        order.getAwbNumber());
                map.put("courierPartner",   order.getCourierPartner());
                map.put("createdAt",        order.getCreatedAt());

                // ── Enrich with customer name, phone, address ──────────────
                try {
                    CustomerDetails customer = customerdetailsService.CustomerDetailsById(order.getCustomerId());
                    if (customer != null) {
                        String fullName = ((customer.getFirstName() != null ? customer.getFirstName() : "") + " "
                                        + (customer.getLastName()  != null ? customer.getLastName()  : "")).trim();
                        map.put("customerName",  fullName.isEmpty() ? "Customer #" + order.getCustomerId() : fullName);
                        map.put("customerPhone", customer.getPhone());
                        map.put("customerEmail", customer.getEmail());

                        // Build full address string
                        StringBuilder addr = new StringBuilder();
                        if (customer.getAddressLine1() != null && !customer.getAddressLine1().isBlank())
                            addr.append(customer.getAddressLine1());
                        if (customer.getAddressLine2() != null && !customer.getAddressLine2().isBlank())
                            addr.append(", ").append(customer.getAddressLine2());
                        if (customer.getCity() != null && !customer.getCity().isBlank())
                            addr.append(", ").append(customer.getCity());
                        if (customer.getState() != null && !customer.getState().isBlank())
                            addr.append(", ").append(customer.getState());
                        if (customer.getPincode() != null && !customer.getPincode().isBlank())
                            addr.append(" - ").append(customer.getPincode());
                        if (customer.getCountry() != null && !customer.getCountry().isBlank())
                            addr.append(", ").append(customer.getCountry());

                        map.put("shippingAddress", addr.length() > 0 ? addr.toString() : null);
                    }
                } catch (Exception e) {
                    log.warn("Could not enrich customer details for order {}: {}", a.getOrderNumber(), e.getMessage());
                }
            });
            return map;
        }).toList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELIVERY BOY — update status
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * PATCH /api/auth/delivery/{orderNumber}/pickup
     * Delivery boy picked up order from warehouse → OUT_FOR_DELIVERY.
     */
    @PatchMapping("/api/auth/delivery/{orderNumber}/pickup")
    public ResponseEntity<?> markPickedUp(
            @PathVariable String orderNumber,
            @RequestParam(required = false) Long deliveryBoyId) {
        try {
            // Update order status
            orderService.updateOrderStatus(orderNumber, OrderStatus.OUT_FOR_DELIVERY);

            // Update delivery_assignments record
            assignmentRepository.findTopByOrderNumberOrderByAssignedAtDesc(orderNumber)
                .ifPresent(a -> {
                    a.setDeliveryStatus(DeliveryStatus.OUT_FOR_DELIVERY);
                    a.setPickedUpAt(LocalDateTime.now());
                    assignmentRepository.save(a);
                    log.info("Delivery assignment updated to OUT_FOR_DELIVERY for order: {}", orderNumber);
                });

            return ResponseEntity.ok(Map.of(
                "orderNumber", orderNumber,
                "status", "OUT_FOR_DELIVERY",
                "message", "Order is now out for delivery"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PATCH /api/auth/delivery/{orderNumber}/delivered
     * Delivery boy marks order as delivered.
     */
    @PatchMapping("/api/auth/delivery/{orderNumber}/delivered")
    public ResponseEntity<?> markDelivered(
            @PathVariable String orderNumber,
            @RequestParam(required = false) String remarks) {
        try {
            orderService.updateOrderStatus(orderNumber, OrderStatus.DELIVERED);

            // Update delivery_assignments record
            assignmentRepository.findTopByOrderNumberOrderByAssignedAtDesc(orderNumber)
                .ifPresent(a -> {
                    a.setDeliveryStatus(DeliveryStatus.DELIVERED);
                    a.setDeliveredAt(LocalDateTime.now());
                    if (remarks != null && !remarks.isBlank()) a.setDeliveryRemarks(remarks);
                    assignmentRepository.save(a);
                    log.info("Delivery assignment marked DELIVERED for order: {}", orderNumber);
                });

            return ResponseEntity.ok(Map.of(
                "orderNumber", orderNumber,
                "status", "DELIVERED",
                "message", "Order delivered successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PATCH /api/auth/delivery/{orderNumber}/failed
     * Delivery boy marks delivery as failed (customer not available, etc.).
     */
    @PatchMapping("/api/auth/delivery/{orderNumber}/failed")
    public ResponseEntity<?> markDeliveryFailed(
            @PathVariable String orderNumber,
            @RequestParam(required = false) String reason) {
        try {
            assignmentRepository.findTopByOrderNumberOrderByAssignedAtDesc(orderNumber)
                .ifPresent(a -> {
                    a.setDeliveryStatus(DeliveryStatus.FAILED);
                    if (reason != null) a.setDeliveryRemarks(reason);
                    assignmentRepository.save(a);
                });

            return ResponseEntity.ok(Map.of(
                "orderNumber", orderNumber,
                "status", "FAILED",
                "message", "Delivery marked as failed"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PATCH /api/auth/delivery/{orderNumber}/cod-collected
     * Delivery boy confirms COD cash collected.
     */
    @PatchMapping("/api/auth/delivery/{orderNumber}/cod-collected")
    public ResponseEntity<?> markCodCollected(
            @PathVariable String orderNumber,
            @RequestParam(required = false) BigDecimal amount) {
        try {
            assignmentRepository.findTopByOrderNumberOrderByAssignedAtDesc(orderNumber)
                .ifPresent(a -> {
                    a.setCashCollected(true);
                    a.setAmountCollected(amount);
                    assignmentRepository.save(a);
                    log.info("COD cash collected for order: {}, amount: {}", orderNumber, amount);
                });

            return ResponseEntity.ok(Map.of(
                "orderNumber", orderNumber,
                "cashCollected", true,
                "message", "COD cash collection recorded"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/auth/delivery/cash-refund-tasks
     * Delivery boy sees all pending cash refund tasks assigned to them.
     * deliveryBoyId passed as query param.
     */
    @GetMapping("/api/auth/delivery/cash-refund-tasks")
    public ResponseEntity<?> getMyCashRefundTasks(
            @RequestParam Long deliveryBoyId) {
        List<DeliveryAssignment> tasks = assignmentRepository
            .findByDeliveryBoyIdAndIsCashRefundTaskTrueAndDeliveryStatus(
                deliveryBoyId, DeliveryStatus.CASH_REFUND_PENDING);
        return ResponseEntity.ok(tasks);
    }

    /**
     * PATCH /api/auth/delivery/cash-refund/{assignmentId}/done
     * Delivery boy confirms cash was handed back to customer.
     */
    @PatchMapping("/api/auth/delivery/cash-refund/{assignmentId}/done")
    public ResponseEntity<?> confirmCashRefundDone(
            @PathVariable Long assignmentId,
            @RequestParam(required = false) String remarks) {
        try {
            DeliveryAssignment task = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found: " + assignmentId));

            task.setDeliveryStatus(DeliveryStatus.CASH_REFUND_DONE);
            task.setCashRefundHandedAt(java.time.LocalDateTime.now());
            if (remarks != null && !remarks.isBlank()) task.setDeliveryRemarks(remarks);
            assignmentRepository.save(task);

            log.info("Cash refund done confirmed for assignment: {}, order: {}", assignmentId, task.getOrderNumber());

            return ResponseEntity.ok(Map.of(
                "assignmentId", assignmentId,
                "orderNumber", task.getOrderNumber(),
                "refundReference", task.getRefundReference(),
                "cashRefundAmount", task.getCashRefundAmount(),
                "status", "CASH_REFUND_DONE",
                "message", "Cash refund confirmed — amount handed to customer"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/auth/admin/delivery/cash-refund-tasks
     * Admin sees all cash refund tasks (pending + done).
     */
    @GetMapping("/api/auth/admin/delivery/cash-refund-tasks")
    public ResponseEntity<?> getAllCashRefundTasks() {
        return ResponseEntity.ok(assignmentRepository.findByIsCashRefundTaskTrue());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELIVERY BOY — return pickup tasks
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/auth/delivery/return-pickup-tasks
     * Delivery boy sees all pending return pickup tasks assigned to them.
     * deliveryBoyId passed as query param.
     */
    @GetMapping("/api/auth/delivery/return-pickup-tasks")
    public ResponseEntity<?> getMyReturnPickupTasks(
            @RequestParam Long deliveryBoyId) {
        List<DeliveryAssignment> tasks = assignmentRepository
            .findByDeliveryBoyIdAndIsReturnPickupTaskTrueAndDeliveryStatus(
                deliveryBoyId, DeliveryStatus.RETURN_PICKUP_PENDING);

        // Enrich with return details (reason, barcode, customer info)
        List<Map<String, Object>> enriched = tasks.stream().map(task -> {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("assignmentId",    task.getId());
            map.put("orderNumber",     task.getOrderNumber());
            map.put("deliveryBoyId",   task.getDeliveryBoyId());
            map.put("deliveryBoyName", task.getDeliveryBoyName());
            map.put("returnReference", task.getReturnReference());
            map.put("deliveryStatus",  task.getDeliveryStatus());
            map.put("assignedAt",      task.getAssignedAt());

            // ── Enrich with barcode + returnReason from the Return record ──────
            // DeliveryAssignment only stores returnReference; barcode + reason live in returns table
            if (task.getReturnReference() != null) {
                returnRepository.findByReturnReference(task.getReturnReference()).ifPresent(ret -> {
                    map.put("barcode",      ret.getBarcode());
                    map.put("returnReason", ret.getReturnReason());
                    map.put("returnStatus", ret.getReturnStatus() != null ? ret.getReturnStatus().name() : null);
                    map.put("returnedStartedAt", ret.getReturnedStartedAt());
                });
            }

            // Enrich with order + customer details
            orderRepository.findByOrderNumber(task.getOrderNumber()).ifPresent(order -> {
                map.put("customerId",    order.getCustomerId());
                map.put("paymentMode",   order.getPaymentMode());
                map.put("totalAmount",   order.getTotalAmount());
                try {
                    CustomerDetails customer = customerdetailsService.CustomerDetailsById(order.getCustomerId());
                    if (customer != null) {
                        String fullName = ((customer.getFirstName() != null ? customer.getFirstName() : "") + " "
                                        + (customer.getLastName()  != null ? customer.getLastName()  : "")).trim();
                        map.put("customerName",  fullName.isEmpty() ? "Customer #" + order.getCustomerId() : fullName);
                        map.put("customerPhone", customer.getPhone());
                        StringBuilder addr = new StringBuilder();
                        if (customer.getAddressLine1() != null && !customer.getAddressLine1().isBlank())
                            addr.append(customer.getAddressLine1());
                        if (customer.getAddressLine2() != null && !customer.getAddressLine2().isBlank())
                            addr.append(", ").append(customer.getAddressLine2());
                        if (customer.getCity() != null && !customer.getCity().isBlank())
                            addr.append(", ").append(customer.getCity());
                        if (customer.getState() != null && !customer.getState().isBlank())
                            addr.append(", ").append(customer.getState());
                        if (customer.getPincode() != null && !customer.getPincode().isBlank())
                            addr.append(" - ").append(customer.getPincode());
                        map.put("customerAddress", addr.length() > 0 ? addr.toString() : null);
                    }
                } catch (Exception e) {
                    log.warn("Could not enrich customer for return pickup task {}: {}", task.getId(), e.getMessage());
                }
                // Include order items so delivery boy knows what to collect
                map.put("items", orderItemRepository.findByOrderNumber(order.getOrderNumber()));
            });
            return map;
        }).toList();

        return ResponseEntity.ok(enriched);
    }

    /**
     * PATCH /api/auth/delivery/return-pickup/{assignmentId}/collected
     * Delivery boy confirms item was collected from customer.
     */
    @PatchMapping("/api/auth/delivery/return-pickup/{assignmentId}/collected")
    public ResponseEntity<?> confirmReturnPickupCollected(
            @PathVariable Long assignmentId,
            @RequestParam(required = false) String remarks) {
        try {
            DeliveryAssignment task = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found: " + assignmentId));

            if (!Boolean.TRUE.equals(task.getIsReturnPickupTask())) {
                return ResponseEntity.badRequest().body(Map.of("error", "This is not a return pickup task"));
            }

            task.setDeliveryStatus(DeliveryStatus.RETURN_PICKUP_DONE);
            task.setReturnPickupCompletedAt(LocalDateTime.now());
            if (remarks != null && !remarks.isBlank()) task.setDeliveryRemarks(remarks);
            assignmentRepository.save(task);

            log.info("Return pickup collected for assignment: {}, order: {}, returnRef: {}",
                assignmentId, task.getOrderNumber(), task.getReturnReference());

            return ResponseEntity.ok(Map.of(
                "assignmentId",    assignmentId,
                "orderNumber",     task.getOrderNumber(),
                "returnReference", task.getReturnReference() != null ? task.getReturnReference() : "",
                "status",          "RETURN_PICKUP_DONE",
                "message",         "Return item collected from customer successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/auth/admin/delivery/return-pickup-tasks
     * Admin sees all return pickup tasks (pending + done).
     */
    @GetMapping("/api/auth/admin/delivery/return-pickup-tasks")
    public ResponseEntity<?> getAllReturnPickupTasks() {
        return ResponseEntity.ok(assignmentRepository.findByIsReturnPickupTaskTrue());
    }

    /**
     * PATCH /api/auth/admin/delivery/return-pickup/{assignmentId}/assign
     * Admin manually assigns an unassigned return pickup task to a delivery boy.
     * Body: { "deliveryBoyId": 5, "deliveryBoyName": "Raju" }
     */
    @PatchMapping("/api/auth/admin/delivery/return-pickup/{assignmentId}/assign")
    public ResponseEntity<?> adminAssignReturnPickup(
            @PathVariable Long assignmentId,
            @RequestBody Map<String, Object> body) {
        try {
            DeliveryAssignment task = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found: " + assignmentId));

            Long deliveryBoyId     = Long.valueOf(body.get("deliveryBoyId").toString());
            String deliveryBoyName = (String) body.getOrDefault("deliveryBoyName", "");

            task.setDeliveryBoyId(deliveryBoyId);
            task.setDeliveryBoyName(deliveryBoyName);
            task.setDeliveryStatus(DeliveryStatus.RETURN_PICKUP_PENDING);
            task.setAssignedAt(LocalDateTime.now());
            assignmentRepository.save(task);

            log.info("Return pickup task {} manually assigned to delivery boy {} by admin", assignmentId, deliveryBoyId);

            return ResponseEntity.ok(Map.of(
                "assignmentId",    assignmentId,
                "deliveryBoyId",   deliveryBoyId,
                "deliveryBoyName", deliveryBoyName,
                "status",          "RETURN_PICKUP_PENDING",
                "message",         "Return pickup task assigned to delivery boy"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN — assign orders to delivery boys
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/admin/delivery/assign
     * Admin assigns an order to a delivery boy.
     * Body: { "orderNumber": "...", "deliveryBoyId": 5, "deliveryBoyName": "Raju" }
     */
    @PostMapping("/api/auth/admin/delivery/assign")
    public ResponseEntity<?> assignOrder(@RequestBody Map<String, Object> body) {
        try {
            String orderNumber   = (String) body.get("orderNumber");
            Long deliveryBoyId   = Long.valueOf(body.get("deliveryBoyId").toString());
            String deliveryBoyName = (String) body.getOrDefault("deliveryBoyName", "");

            if (orderNumber == null || deliveryBoyId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "orderNumber and deliveryBoyId are required"));
            }

            Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderNumber));

            // Mark order as SHIPPED so delivery boy can see it
            order.setOrderStatus(OrderStatus.SHIPPED);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);

            // Create delivery assignment record
            DeliveryAssignment assignment = DeliveryAssignment.builder()
                .orderNumber(orderNumber)
                .deliveryBoyId(deliveryBoyId)
                .deliveryBoyName(deliveryBoyName)
                .deliveryStatus(DeliveryStatus.ASSIGNED)
                .assignedAt(LocalDateTime.now())
                .build();
            assignmentRepository.save(assignment);

            log.info("Order {} assigned to delivery boy {} ({})", orderNumber, deliveryBoyId, deliveryBoyName);

            return ResponseEntity.ok(Map.of(
                "orderNumber", orderNumber,
                "deliveryBoyId", deliveryBoyId,
                "deliveryBoyName", deliveryBoyName,
                "status", "ASSIGNED",
                "message", "Order assigned to delivery boy successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/auth/admin/delivery/assignments
     * Admin sees all delivery assignments.
     */
    @GetMapping("/api/auth/admin/delivery/assignments")
    public ResponseEntity<?> getAllAssignments() {
        return ResponseEntity.ok(assignmentRepository.findAll());
    }

    /**
     * GET /api/auth/admin/delivery/assignments/{deliveryBoyId}
     * Admin sees all assignments for a specific delivery boy.
     */
    @GetMapping("/api/auth/admin/delivery/assignments/{deliveryBoyId}")
    public ResponseEntity<?> getAssignmentsByDeliveryBoy(@PathVariable Long deliveryBoyId) {
        return ResponseEntity.ok(assignmentRepository.findByDeliveryBoyId(deliveryBoyId));
    }

    /**
     * GET /api/auth/admin/delivery/order/{orderNumber}
     * Admin sees full assignment history for an order.
     */
    @GetMapping("/api/auth/admin/delivery/order/{orderNumber}")
    public ResponseEntity<?> getOrderAssignmentHistory(@PathVariable String orderNumber) {
        return ResponseEntity.ok(assignmentRepository.findByOrderNumberOrderByAssignedAtDesc(orderNumber));
    }

    /**
     * PATCH /api/auth/admin/orders/{orderNumber}/assign-delivery
     * Backward-compatible endpoint — marks order as SHIPPED (existing frontend uses this).
     */
    @PatchMapping("/api/auth/admin/orders/{orderNumber}/assign-delivery")
    public ResponseEntity<?> assignToDelivery(@PathVariable String orderNumber) {
        try {
            orderService.updateOrderStatus(orderNumber, OrderStatus.SHIPPED);
            return ResponseEntity.ok(Map.of(
                "orderNumber", orderNumber,
                "status", "SHIPPED",
                "message", "Order assigned to delivery"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
