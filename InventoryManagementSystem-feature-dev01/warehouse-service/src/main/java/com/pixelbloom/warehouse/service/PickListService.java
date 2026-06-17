package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.model.PickList;
import com.pixelbloom.warehouse.model.PickListLine;
import com.pixelbloom.warehouse.repository.PickListLineRepository;
import com.pixelbloom.warehouse.repository.PickListRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

/**
 * Pick List Service
 *
 * Flow:
 *   Admin marks order PROCESSING
 *     → orders-service calls POST /api/warehouse/pick-lists/create
 *     → PickListService creates PickList + PickListLine per item
 *     → WAREHOUSE_MANAGER assigns Picker + Packer via dashboard
 *     → PICKER sees assigned list → starts → confirms each line → completes
 *     → Order advances to PACKED
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PickListService {

    private final PickListRepository pickListRepository;
    private final PickListLineRepository pickListLineRepository;
    private final RestTemplate restTemplate;
    private final WarehouseEventPublisher eventPublisher;
    private final PickerStatusService pickerStatusService;

    @Value("${orders.service.url:http://localhost:9091}")
    private String ordersServiceUrl;

    /**
     * Handle a new CONFIRMED order from orders-service.
     *
     * This is the entry point for the new direct-to-warehouse flow:
     *   Order CONFIRMED → orders-service calls this → PickList created → Manager notified via WebSocket
     *
     * Admin has no "Mark Processing" button.
     * Manager gets an instant WebSocket notification → manager assigns picker.
     *
     * @param orderNumber    order number
     * @param customerId     customer ID
     * @param warehouseId    assigned warehouse ID (from inventory lookup)
     * @param warehouseName  assigned warehouse name
     * @param deliveryPincode customer delivery pincode
     * @param deliverySpeed  STANDARD / EXPRESS / SAME_DAY
     * @param items          list of {productId, productName, barcode, quantity, locationCode, locationId}
     */
    @Transactional
    public PickList handleNewOrder(String orderNumber, Long customerId,
                                   Long warehouseId, String warehouseName,
                                   String deliveryPincode, String deliverySpeed,
                                   List<Map<String, Object>> items) {
        // 1. Create pick list (idempotent)
        PickList pickList = createPickListForWarehouse(orderNumber, customerId, warehouseId, items);

        // 2. Notify ALL warehouse managers via WebSocket — instant dashboard notification
        Map<String, Object> notifData = new HashMap<>();
        notifData.put("pickListId",      pickList.getId());
        notifData.put("orderNumber",     orderNumber);
        notifData.put("customerId",      customerId);
        notifData.put("warehouseId",     warehouseId);
        notifData.put("warehouseName",   warehouseName);
        notifData.put("deliveryPincode", deliveryPincode);
        notifData.put("deliverySpeed",   deliverySpeed);
        notifData.put("itemCount",       items.size());

        // Broadcast to all managers — any manager of this warehouse can pick it up
        eventPublisher.notifyAllManagers(
                "NEW_ORDER_RECEIVED",
                "🆕 New Order — Assign Picker",
                "Order #" + orderNumber + " arrived at " + warehouseName +
                        " (" + items.size() + " item" + (items.size() > 1 ? "s" : "") +
                        ") | Delivery: " + deliverySpeed + " | Pincode: " + deliveryPincode,
                notifData
        );

        // 3. Also notify admin dashboard
        eventPublisher.notifyAdmin(
                "NEW_ORDER_RECEIVED",
                "📦 New Order → " + warehouseName,
                "Order #" + orderNumber + " assigned to " + warehouseName +
                        ". Warehouse Manager will assign picker.",
                notifData
        );

        log.info("✅ New order {} handled — PickList #{} created, managers notified via WebSocket", orderNumber, pickList.getId());
        return pickList;
    }

    /**
     * Internal helper — create pick list with explicit warehouseId.
     * Used by handleNewOrder() to respect the warehouse assigned by orders-service.
     */
    private PickList createPickListForWarehouse(String orderNumber, Long customerId,
                                                Long warehouseId, List<Map<String, Object>> items) {
        // Idempotent — don't create duplicate pick lists
        if (pickListRepository.existsByOrderNumber(orderNumber)) {
            log.info("Pick list already exists for order: {}", orderNumber);
            return pickListRepository.findByOrderNumber(orderNumber).orElseThrow();
        }

        PickList pickList = PickList.builder()
                .orderNumber(orderNumber)
                .customerId(customerId)
                .warehouseId(warehouseId != null ? warehouseId : 1L)
                .status("PENDING")
                .build();

        PickList saved = pickListRepository.save(pickList);

        for (Map<String, Object> item : items) {
            PickListLine line = PickListLine.builder()
                    .pickList(saved)
                    .productId(toLong(item.get("productId")))
                    .productName(toString(item.get("productName")))
                    .barcode(toString(item.get("barcode")))
                    .quantity(toInt(item.get("quantity"), 1))
                    .locationCode(toString(item.get("locationCode")))
                    .locationId(toLong(item.get("locationId")))
                    .confirmed(false)
                    .build();
            pickListLineRepository.save(line);
        }

        log.info("✅ Pick list created for order: {} with {} items (warehouseId={})", orderNumber, items.size(), warehouseId);
        return saved;
    }

    /**
     * Create pick list when order moves to PROCESSING.
     * Called by orders-service webhook or admin action.
     *
     * @param orderNumber  order number
     * @param customerId   customer ID
     * @param items        list of {productId, productName, barcode, quantity, locationCode, locationId}
     */
    @Transactional
    public PickList createPickList(String orderNumber, Long customerId, List<Map<String, Object>> items) {
        // Idempotent — don't create duplicate pick lists
        if (pickListRepository.existsByOrderNumber(orderNumber)) {
            log.info("Pick list already exists for order: {}", orderNumber);
            return pickListRepository.findByOrderNumber(orderNumber).orElseThrow();
        }

        PickList pickList = PickList.builder()
                .orderNumber(orderNumber)
                .customerId(customerId)
                .warehouseId(1L) // default warehouse
                .status("PENDING")
                .build();

        PickList saved = pickListRepository.save(pickList);

        // Create one line per item
        for (Map<String, Object> item : items) {
            PickListLine line = PickListLine.builder()
                    .pickList(saved)
                    .productId(toLong(item.get("productId")))
                    .productName(toString(item.get("productName")))
                    .barcode(toString(item.get("barcode")))
                    .quantity(toInt(item.get("quantity"), 1))
                    .locationCode(toString(item.get("locationCode")))
                    .locationId(toLong(item.get("locationId")))
                    .confirmed(false)
                    .build();
            pickListLineRepository.save(line);
        }

        log.info("✅ Pick list created for order: {} with {} items", orderNumber, items.size());
        return saved;
    }

    /**
     * Get all pick lists by status (PENDING / IN_PROGRESS / COMPLETED)
     */
    public List<PickList> getByStatus(String status) {
        return pickListRepository.findByStatus(status.toUpperCase());
    }

    /**
     * Get unassigned PENDING pick lists — for Manager dashboard
     */
    public List<PickList> getUnassigned() {
        return pickListRepository.findByStatusAndAssignedPickerIdIsNull("PENDING");
    }

    /**
     * Get pick lists assigned to a specific picker
     */
    public List<PickList> getByPickerId(Long pickerId) {
        return pickListRepository.findByAssignedPickerId(pickerId);
    }

    /**
     * Get pick lists assigned to a specific packer
     */
    public List<PickList> getByPackerId(Long packerId) {
        return pickListRepository.findByAssignedPackerId(packerId);
    }

    /**
     * Get pick lists assigned to a specific shipping staff
     */
    public List<PickList> getByShippingId(Long shippingId) {
        return pickListRepository.findByAssignedShippingId(shippingId);
    }

    /**
     * Get pick lists assigned to a specific packer (COMPLETED — ready to pack)
     * Email-based — reliable across Customer.id vs WarehouseStaff.id mismatch
     */
    public List<PickList> getCompletedByPackerEmail(String email) {
        return pickListRepository.findByAssignedPackerEmailIgnoreCaseAndStatus(email, "COMPLETED");
    }

    /**
     * Get pick lists assigned to a specific picker (PENDING + IN_PROGRESS)
     * Email-based
     */
    public List<PickList> getActiveByPickerEmail(String email) {
        return pickListRepository.findByAssignedPickerEmailIgnoreCaseAndStatusIn(email, List.of("PENDING", "IN_PROGRESS"));
    }

    /**
     * Get pick lists assigned to a specific shipping staff (COMPLETED)
     * Email-based
     */
    public List<PickList> getCompletedByShippingEmail(String email) {
        return pickListRepository.findByAssignedShippingEmailIgnoreCaseAndStatus(email, "COMPLETED");
    }

    /**
     * Warehouse Manager assigns Picker, Packer AND Shipping staff to a PickList.
     * Accepts emails so dashboard can filter by email (avoids Customer.id vs WarehouseStaff.id mismatch)
     */
    @Transactional
    public PickList assignStaff(Long pickListId,
                                Long pickerId,   String pickerName,   String pickerEmail,
                                Long packerId,   String packerName,   String packerEmail,
                                Long shippingId, String shippingName, String shippingEmail) {
        PickList pl = pickListRepository.findById(pickListId)
                .orElseThrow(() -> new RuntimeException("Pick list not found: " + pickListId));

        if ("COMPLETED".equals(pl.getStatus())) {
            // Allow re-assign on COMPLETED pick list — manager can change it
            // (picking झाली असली तरी packer/shipping बदलणं valid आहे)
            log.info("Re-assigning COMPLETED pick list {} — allowed for manager", pickListId);
        }

        pl.setAssignedPickerId(pickerId);
        pl.setAssignedPickerName(pickerName);
        pl.setAssignedPickerEmail(pickerEmail);
        pl.setAssignedPackerId(packerId);
        pl.setAssignedPackerName(packerName);
        pl.setAssignedPackerEmail(packerEmail);
        pl.setAssignedShippingId(shippingId);
        pl.setAssignedShippingName(shippingName);
        pl.setAssignedShippingEmail(shippingEmail);
        pl.setAssignedAt(java.time.LocalDateTime.now());

        log.info("✅ PickList {} assigned — Picker: {} ({}), Packer: {} ({}), Shipping: {} ({})",
                pickListId, pickerName, pickerId, packerName, packerId, shippingName, shippingId);

        PickList saved = pickListRepository.save(pl);

        // 🔔 Picker ला notification
        Map<String, Object> assignData = new HashMap<>();
        assignData.put("pickListId", pickListId);
        assignData.put("orderNumber", pl.getOrderNumber());
        assignData.put("pickerName",   pickerName);
        assignData.put("packerName",   packerName);
        assignData.put("shippingName", shippingName);

        eventPublisher.notifyPicker(pickerId,
                "PICK_LIST_ASSIGNED",
                "📋 New Pick List Assigned",
                "Pick List #" + pickListId + " for Order " + pl.getOrderNumber() + " assigned to you.",
                assignData);

        // 🔔 Packer ला upcoming notification
        if (packerId != null) {
            eventPublisher.notifyPacker(packerId,
                    "PACK_LIST_UPCOMING",
                    "📦 Upcoming Pack Job",
                    "Pick List #" + pickListId + " for Order " + pl.getOrderNumber() + " will be ready to pack soon.",
                    assignData);
        }

        // 🔔 Shipping ला upcoming notification
        if (shippingId != null) {
            eventPublisher.notifyShipping(
                    "SHIP_LIST_UPCOMING",
                    "🚚 Upcoming Shipment",
                    "Order " + pl.getOrderNumber() + " will be ready to ship soon.",
                    assignData);
        }

        // 🔔 Admin ला
        eventPublisher.notifyAdmin("PICK_LIST_ASSIGNED",
                "✅ Staff Assigned",
                "Pick List #" + pickListId + " → Picker: " + pickerName +
                ", Packer: " + packerName + ", Shipping: " + shippingName,
                assignData);

        return saved;
    }

    /**
     * Remove assignment from a pick list (Manager can reassign)
     */
    @Transactional
    public PickList unassignStaff(Long pickListId) {
        PickList pl = pickListRepository.findById(pickListId)
                .orElseThrow(() -> new RuntimeException("Pick list not found: " + pickListId));

        if ("COMPLETED".equals(pl.getStatus())) {
            throw new RuntimeException("Cannot unassign a completed pick list.");
        }
        if ("IN_PROGRESS".equals(pl.getStatus())) {
            throw new RuntimeException("Cannot unassign a pick list that is already in progress.");
        }

        pl.setAssignedPickerId(null);
        pl.setAssignedPickerName(null);
        pl.setAssignedPickerEmail(null);
        pl.setAssignedPackerId(null);
        pl.setAssignedPackerName(null);
        pl.setAssignedPackerEmail(null);
        pl.setAssignedShippingId(null);
        pl.setAssignedShippingName(null);
        pl.setAssignedShippingEmail(null);
        pl.setAssignedAt(null);

        log.info("↩️ PickList {} unassigned by manager", pickListId);
        return pickListRepository.save(pl);
    }

    /**
     * Picker starts a pick list → status: IN_PROGRESS
     */
    @Transactional
    public PickList startPickList(Long pickListId) {
        PickList pl = pickListRepository.findById(pickListId)
                .orElseThrow(() -> new RuntimeException("Pick list not found: " + pickListId));
        pl.setStatus("IN_PROGRESS");
        pl.setStartedAt(LocalDateTime.now());
        PickList saved = pickListRepository.save(pl);

        // 🟡 Picker BUSY mark करा
        if (pl.getAssignedPickerId() != null) {
            pickerStatusService.markBusy(pl.getAssignedPickerId());
        }
        return saved;
    }

    /**
     * Picker confirms one line (item picked from bin)
     */
    @Transactional
    public PickListLine confirmLine(Long pickListId, Long lineId) {
        PickListLine line = pickListLineRepository.findById(lineId)
                .orElseThrow(() -> new RuntimeException("Pick list line not found: " + lineId));

        // Note: skip pick list ID validation to avoid lazy load issues
        line.setConfirmed(true);
        line.setConfirmedAt(LocalDateTime.now());
        return pickListLineRepository.save(line);
    }

    /**
     * Complete pick list — all lines confirmed → status: COMPLETED
     */
    @Transactional
    public PickList completePickList(Long pickListId) {
        PickList pl = pickListRepository.findById(pickListId)
                .orElseThrow(() -> new RuntimeException("Pick list not found: " + pickListId));

        // Mark all unconfirmed lines as confirmed
        List<PickListLine> lines = pickListLineRepository.findByPickListId(pickListId);
        lines.forEach(line -> {
            if (!Boolean.TRUE.equals(line.getConfirmed())) {
                line.setConfirmed(true);
                line.setConfirmedAt(LocalDateTime.now());
            }
        });
        pickListLineRepository.saveAll(lines);

        pl.setStatus("COMPLETED");
        pl.setCompletedAt(LocalDateTime.now());
        PickList completed = pickListRepository.save(pl);

        // ✅ Notify orders-service → advance order status to PICKED (not PACKED yet)
        notifyOrderPicked(pl.getOrderNumber());

        // Common data for all notifications
        Map<String, Object> pickData = new HashMap<>();
        pickData.put("pickListId", pickListId);
        pickData.put("orderNumber", pl.getOrderNumber());
        pickData.put("customerId", pl.getCustomerId());
        pickData.put("pickerName", pl.getAssignedPickerName());

        // 🔔 WebSocket — Packer ला instant notification (order ready to pack)
        if (pl.getAssignedPackerId() != null) {
            eventPublisher.notifyPacker(pl.getAssignedPackerId(),
                    "ORDER_PICKED",
                    "🛒 Order Ready to Pack",
                    "Order " + pl.getOrderNumber() + " picked by " + pl.getAssignedPickerName() + ". Ready for packing.",
                    pickData);
        }

        // 🔔 WebSocket — Picker ला confirmation notification (pick complete झाली)
        if (pl.getAssignedPickerId() != null) {
            eventPublisher.notifyPicker(pl.getAssignedPickerId(),
                    "PICK_COMPLETE",
                    "✅ Pick Complete: #" + pl.getOrderNumber(),
                    "Pick List #" + pickListId + " completed. Order " + pl.getOrderNumber() + " sent to packer.",
                    pickData);
        }

        // 🔔 WebSocket — Admin ला update
        eventPublisher.notifyAdmin("ORDER_PICKED",
                "🛒 Order Picked: #" + pl.getOrderNumber(),
                "Order picked by " + pl.getAssignedPickerName() + ". Status → PICKED. Ready for packing.",
                pickData);

        // 🔔 WebSocket — Warehouse Manager ला update
        eventPublisher.notifyAllManagers("ORDER_PICKED",
                "🛒 Order Picked: #" + pl.getOrderNumber(),
                "Order " + pl.getOrderNumber() + " picked by " + pl.getAssignedPickerName() + ". Status → PICKED.",
                pickData);

        // NOTE: Shipping ला ORDER_PICKED early alert काढला — shipping ला actionable notification
        // ORDER_PACKED वर येते (PackDetailService). ORDER_PICKED + ORDER_PACKED दोन्ही आल्यावर
        // ShippingDashboard ला double toast येत होती. Shipping ला फक्त SHIP_LIST_UPCOMING (assignment)
        // आणि ORDER_PACKED (ready to ship) पुरे.

        // 🟢 Picker task complete → ONLINE mark करा
        if (pl.getAssignedPickerId() != null) {
            pickerStatusService.markOnlineAfterTask(pl.getAssignedPickerId());
        }

        return completed;
    }

    /**
     * Call orders-service to advance order status to PICKED.
     * Non-fatal — pick list is still marked COMPLETED even if this call fails.
     * Uses the no-auth /api/orders/{orderNumber}/status endpoint directly on orders-service.
     */
    private void notifyOrderPicked(String orderNumber) {
        if (orderNumber == null) return;
        try {
            // Use the direct no-auth endpoint — avoids any auth/gateway issues
            // /api/orders/{orderNumber}/status only allows CANCELLED for users,
            // so we use the admin endpoint which is also permitAll() in SecurityConfig
            String url = ordersServiceUrl + "/api/auth/admin/orders/" + orderNumber + "/status?status=PICKED";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>("", headers);
            ResponseEntity<Object> res = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.PATCH,
                    entity,
                    Object.class
            );
            log.info("✅ Order {} advanced to PICKED — orders-service responded: {}", orderNumber, res.getStatusCode());
        } catch (Exception e) {
            log.warn("⚠️ Could not advance order {} to PICKED in orders-service (non-fatal): {}", orderNumber, e.getMessage());
        }
    }

    /**
     * Call orders-service to advance order status to PACKED.
     * Called by PackDetailService after pack details are saved.
     * Non-fatal — pack details are still saved even if this call fails.
     */
    public void notifyOrderPacked(String orderNumber) {
        if (orderNumber == null) return;
        try {
            String url = ordersServiceUrl + "/api/auth/admin/orders/" + orderNumber + "/status?status=PACKED";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>("", headers);
            ResponseEntity<Object> res = restTemplate.exchange(
                    url,
                    org.springframework.http.HttpMethod.PATCH,
                    entity,
                    Object.class
            );
            log.info("✅ Order {} advanced to PACKED — orders-service responded: {}", orderNumber, res.getStatusCode());
        } catch (Exception e) {
            log.warn("⚠️ Could not advance order {} to PACKED in orders-service (non-fatal): {}", orderNumber, e.getMessage());
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }

    private String toString(Object val) {
        return val != null ? val.toString() : null;
    }

    private int toInt(Object val, int defaultVal) {
        if (val == null) return defaultVal;
        if (val instanceof Number) return ((Number) val).intValue();
        try { return Integer.parseInt(val.toString()); } catch (Exception e) { return defaultVal; }
    }
}
