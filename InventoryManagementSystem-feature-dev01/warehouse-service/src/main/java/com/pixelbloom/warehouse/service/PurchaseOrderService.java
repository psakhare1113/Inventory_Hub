package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.client.EmailNotificationClient;
import com.pixelbloom.warehouse.dto.CreatePurchaseOrderRequest;
import com.pixelbloom.warehouse.enums.POStatus;
import com.pixelbloom.warehouse.model.PurchaseOrder;
import com.pixelbloom.warehouse.model.PurchaseOrderLine;
import com.pixelbloom.warehouse.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Purchase Order Service (FR-20 to FR-23)
 *
 * Role-based PO Workflow:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  WHO CAN CREATE PO (DRAFT):                                     │
 * │    • WAREHOUSE_MANAGER  — stock kami zali tar PO raise karto    │
 * │    • PROCUREMENT        — supplier la officially PO pathavto    │
 * │    • INVENTORY_MANAGER  — inventory level manage karto          │
 * │    • ADMIN              — full access                           │
 * │                                                                 │
 * │  WHO CAN APPROVE PO (DRAFT → APPROVED):                        │
 * │    • ADMIN              — full authority                        │
 * │    • FINANCE_TEAM       — budget/payment approval               │
 * │                                                                 │
 * │  WHO CAN RECEIVE PO (APPROVED → RECEIVING → CLOSED):           │
 * │    • WAREHOUSE_MANAGER  — maal verify karto, GRN create karto  │
 * │    • ADMIN              — full access                           │
 * └─────────────────────────────────────────────────────────────────┘
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final EmailNotificationClient emailNotificationClient;
    private final WarehouseEventPublisher eventPublisher;

    // ── Role permission helpers ───────────────────────────────────────────────

    /**
     * Roles allowed to CREATE a Purchase Order.
     * Warehouse Manager, Procurement, Inventory Manager, Admin.
     */
    private boolean isAllowedToCreatePO(String role) {
        if (role == null) return false;
        return switch (role.toUpperCase()) {
            case "WAREHOUSE_MANAGER", "PROCUREMENT", "INVENTORY_MANAGER", "ADMIN" -> true;
            default -> false;
        };
    }

    /**
     * Roles allowed to APPROVE a Purchase Order.
     * Only Admin and Finance Team — they control budget.
     */
    private boolean isAllowedToApprovePO(String role) {
        if (role == null) return false;
        return switch (role.toUpperCase()) {
            case "ADMIN", "FINANCE_TEAM" -> true;
            default -> false;
        };
    }

    /**
     * Roles allowed to CANCEL a Purchase Order.
     */
    private boolean isAllowedToCancelPO(String role) {
        if (role == null) return false;
        return switch (role.toUpperCase()) {
            case "ADMIN", "PROCUREMENT", "FINANCE_TEAM" -> true;
            default -> false;
        };
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /**
     * Create new Purchase Order (FR-21)
     * Allowed roles: WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN
     */
    @Transactional
    public PurchaseOrder createPurchaseOrder(CreatePurchaseOrderRequest request, Long userId, String userRole) {
        String role = (userRole != null && !userRole.isBlank()) ? userRole.toUpperCase() : "ADMIN";
        log.info("Creating PO for supplier: {} | by role: {}", request.getSupplierId(), role);

        if (!isAllowedToCreatePO(role)) {
            throw new RuntimeException(
                "Access denied: Role '" + role + "' cannot create Purchase Orders. " +
                "Allowed: WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN"
            );
        }

        // requestedByRole — prefer explicit field in request body, fallback to header role
        String requestedByRole = (request.getRequestedByRole() != null && !request.getRequestedByRole().isBlank())
                ? request.getRequestedByRole().toUpperCase()
                : role;

        String poNumber = generatePONumber();

        PurchaseOrder po = PurchaseOrder.builder()
                .poNumber(poNumber)
                .supplierId(request.getSupplierId())
                .warehouseId(request.getWarehouseId())
                .status(POStatus.DRAFT)
                .expectedDate(request.getExpectedDate())
                .notes(request.getNotes())
                .termsAndConditions(request.getTermsAndConditions())
                .requestedByRole(requestedByRole)
                .creditTerms(request.getCreditTerms() != null ? request.getCreditTerms() : "NET_30")
                .shipToAddress(request.getShipToAddress())
                .receiveMaterials(request.getReceiveMaterials() != null ? request.getReceiveMaterials() : true)
                .poDate(request.getPoDate() != null ? request.getPoDate() : java.time.LocalDate.now())
                .createdBy(userId)
                .updatedBy(userId)
                .build();

        List<PurchaseOrderLine> lines = request.getLines().stream()
                .map(lineReq -> PurchaseOrderLine.builder()
                        .purchaseOrder(po)
                        .productId(lineReq.getProductId())
                        .productName(lineReq.getProductName())
                        .sku(lineReq.getSku())
                        .qtyOrdered(lineReq.getQtyOrdered())
                        .qtyReceived(0)
                        .unitPrice(lineReq.getUnitPrice())
                        .notes(lineReq.getNotes())
                        .build())
                .collect(Collectors.toList());

        po.setLines(lines);
        po.calculateTotalAmount();

        PurchaseOrder savedPO = purchaseOrderRepository.save(po);
        log.info("PO created: {} | requestedByRole: {}", poNumber, requestedByRole);

        // 🔔 Notify Admin/Finance that a new PO needs approval
        try {
            Map<String, Object> poData = new HashMap<>();
            poData.put("poId", savedPO.getId());
            poData.put("poNumber", savedPO.getPoNumber());
            poData.put("requestedByRole", requestedByRole);
            poData.put("totalAmount", savedPO.getTotalAmount());
            eventPublisher.notifyAll("PO_CREATED",
                    "📋 New PO Created: " + savedPO.getPoNumber(),
                    "Created by " + requestedByRole + ". Awaiting Admin/Finance approval.",
                    poData);
        } catch (Exception e) {
            log.warn("WebSocket notification failed for PO creation {}: {}", poNumber, e.getMessage());
        }

        // 🔔 Notify Admin — pricing auto-calculated for each PO line
        // WebSocket वापरतो कारण Warehouse आणि Admin वेगळ्या ports/tabs वर असतात
        // localStorage cross-origin share होत नाही — WebSocket /topic/admin/notifications वापरतो
        try {
            for (PurchaseOrderLine line : savedPO.getLines()) {
                if (line.getUnitPrice() == null || line.getUnitPrice().compareTo(java.math.BigDecimal.ZERO) <= 0) continue;

                double costPrice   = line.getUnitPrice().doubleValue();
                double gstAmt      = costPrice * 18.0 / 100.0;
                double sellingPrice = Math.round((costPrice + 50 + 80 + 500 + gstAmt) * 100.0) / 100.0;
                double mrp         = Math.ceil(sellingPrice * 1.20 / 100.0) * 100.0;
                double discount    = Math.round(((mrp - sellingPrice) / mrp * 100.0) * 100.0) / 100.0;

                String productName = line.getProductName() != null ? line.getProductName() : "Product #" + line.getProductId();

                Map<String, Object> pricingData = new HashMap<>();
                pricingData.put("productId",    line.getProductId());
                pricingData.put("productName",  productName);
                pricingData.put("poNumber",     savedPO.getPoNumber());
                pricingData.put("costPrice",    costPrice);
                pricingData.put("sellingPrice", sellingPrice);
                pricingData.put("mrp",          mrp);
                pricingData.put("discount",     discount);

                eventPublisher.notifyAdmin(
                        "PRICING_UPDATED",
                        "🔄 Pricing Updated: " + productName,
                        "PO " + savedPO.getPoNumber() + " → Selling ₹" + sellingPrice + " | MRP ₹" + mrp + " | " + discount + "% OFF",
                        pricingData
                );
                log.info("🔔 Pricing notification sent for product {} ({}): selling=₹{} MRP=₹{} discount={}%",
                        line.getProductId(), productName, sellingPrice, mrp, discount);
            }
        } catch (Exception e) {
            log.warn("WebSocket pricing notification failed for PO {}: {}", poNumber, e.getMessage());
        }

        return savedPO;
    }

    /**
     * Backward-compatible overload — no role header (defaults to ADMIN)
     */
    @Transactional
    public PurchaseOrder createPurchaseOrder(CreatePurchaseOrderRequest request, Long userId) {
        return createPurchaseOrder(request, userId, "ADMIN");
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    /**
     * Approve Purchase Order (FR-22)
     * Allowed roles: ADMIN, FINANCE_TEAM
     * Flow: DRAFT → APPROVED → Warehouse Manager notified to receive stock
     */
    @Transactional
    public PurchaseOrder approvePurchaseOrder(Long poId, Long approvedByUserId, String approverRole) {
        String role = (approverRole != null && !approverRole.isBlank()) ? approverRole.toUpperCase() : "ADMIN";
        log.info("Approving PO: {} | by role: {}", poId, role);

        if (!isAllowedToApprovePO(role)) {
            throw new RuntimeException(
                "Access denied: Role '" + role + "' cannot approve Purchase Orders. " +
                "Only ADMIN and FINANCE_TEAM can approve POs."
            );
        }

        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase order not found: " + poId));

        if (po.getStatus() != POStatus.DRAFT) {
            throw new RuntimeException(
                "Cannot approve PO with status: " + po.getStatus() + ". Only DRAFT POs can be approved."
            );
        }

        po.setStatus(POStatus.APPROVED);
        po.setApprovedBy(approvedByUserId != null ? approvedByUserId : 1L);
        po.setApprovedAt(LocalDateTime.now());
        po.setApprovedByRole(role);
        po.setUpdatedBy(approvedByUserId != null ? approvedByUserId : 1L);

        PurchaseOrder saved = purchaseOrderRepository.save(po);
        log.info("PO {} approved by role: {}", poId, role);

        // 🔔 WebSocket — फक्त Receiving Clerk ला notify करा
        // Warehouse Manager, Admin, बाकी staff ला नाही — त्यांना need नाही
        Map<String, Object> poData = new HashMap<>();
        poData.put("poId", poId);
        poData.put("poNumber", saved.getPoNumber());
        poData.put("supplierId", saved.getSupplierId());
        poData.put("totalAmount", saved.getTotalAmount());
        poData.put("approvedByRole", role);
        eventPublisher.notifyReceiving("PO_APPROVED",
                "✅ PO Approved: " + saved.getPoNumber(),
                "PO approved by " + role + ". Please prepare to receive incoming stock.",
                poData);

        // ── Email: फक्त Receiving Clerk ला ───────────────────────────────────
        try {
            String supplierName  = "Supplier #" + saved.getSupplierId();
            String expectedDate  = saved.getExpectedDate() != null ? saved.getExpectedDate().toString() : "Not specified";
            String totalAmount   = saved.getTotalAmount() != null ? "₹" + saved.getTotalAmount().toPlainString() : "N/A";
            int    totalItems    = saved.getLines() != null ? saved.getLines().size() : 0;

            emailNotificationClient.sendPoApprovedNotification(
                    saved.getPoNumber(), supplierName, expectedDate, totalAmount, totalItems
            );
        } catch (Exception e) {
            log.warn("Email notification failed for PO {}: {}", poId, e.getMessage());
        }

        return saved;
    }

    /**
     * Backward-compatible overload — no role (defaults to ADMIN)
     */
    @Transactional
    public PurchaseOrder approvePurchaseOrder(Long poId, Long approvedBy) {
        return approvePurchaseOrder(poId, approvedBy, "ADMIN");
    }

    // ── Receiving status ──────────────────────────────────────────────────────

    /**
     * Update PO receiving status (FR-23)
     * Called by GoodsReceiptService when Warehouse Manager receives stock.
     * Flow: APPROVED → RECEIVING (partial) → CLOSED (fully received)
     */
    @Transactional
    public void updateReceivingStatus(Long poId) {
        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase order not found: " + poId));

        if (po.getFirstReceivedAt() == null) {
            po.setFirstReceivedAt(LocalDateTime.now());
        }

        if (po.isFullyReceived()) {
            po.setStatus(POStatus.CLOSED);
            po.setFullyReceivedAt(LocalDateTime.now());
            log.info("PO {} fully received — status set to CLOSED", poId);

            // 🔔 Notify Admin/Procurement that PO is fully received
            try {
                Map<String, Object> poData = new HashMap<>();
                poData.put("poId", poId);
                poData.put("poNumber", po.getPoNumber());
                eventPublisher.notifyAll("PO_CLOSED",
                        "📦 PO Closed: " + po.getPoNumber(),
                        "All items received. Stock has been updated.",
                        poData);
            } catch (Exception e) {
                log.warn("WebSocket notification failed for PO close {}: {}", poId, e.getMessage());
            }
        } else if (po.isPartiallyReceived()) {
            po.setStatus(POStatus.RECEIVING);
            log.info("PO {} partially received — status set to RECEIVING", poId);
        }

        purchaseOrderRepository.save(po);
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    /**
     * Cancel Purchase Order
     * Allowed roles: ADMIN, PROCUREMENT, FINANCE_TEAM
     */
    @Transactional
    public PurchaseOrder cancelPurchaseOrder(Long poId, Long userId, String userRole) {
        String role = (userRole != null && !userRole.isBlank()) ? userRole.toUpperCase() : "ADMIN";
        log.info("Cancelling PO: {} | by role: {}", poId, role);

        if (!isAllowedToCancelPO(role)) {
            throw new RuntimeException(
                "Access denied: Role '" + role + "' cannot cancel Purchase Orders."
            );
        }

        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase order not found: " + poId));

        if (po.getStatus() == POStatus.CLOSED) {
            throw new RuntimeException("Cannot cancel a CLOSED purchase order");
        }
        if (po.getStatus() == POStatus.RECEIVING) {
            throw new RuntimeException("Cannot cancel a PO that is already being received (RECEIVING status)");
        }

        po.setStatus(POStatus.CANCELLED);
        po.setUpdatedBy(userId);

        return purchaseOrderRepository.save(po);
    }

    /**
     * Backward-compatible overload — no role
     */
    @Transactional
    public PurchaseOrder cancelPurchaseOrder(Long poId, Long userId) {
        return cancelPurchaseOrder(poId, userId, "ADMIN");
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public PurchaseOrder getPurchaseOrderById(Long poId) {
        return purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase order not found: " + poId));
    }

    public List<PurchaseOrder> getPurchaseOrdersByStatus(POStatus status) {
        return purchaseOrderRepository.findByStatus(status);
    }

    public List<PurchaseOrder> getPurchaseOrdersBySupplier(Long supplierId) {
        return purchaseOrderRepository.findBySupplierId(supplierId);
    }

    public List<PurchaseOrder> getAllPurchaseOrders() {
        return purchaseOrderRepository.findAll();
    }

    // ── Update ────────────────────────────────────────────────────────────────

    /**
     * Update Purchase Order — only DRAFT POs can be edited.
     * Allowed roles: WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN
     */
    @Transactional
    public PurchaseOrder updatePurchaseOrder(Long poId, CreatePurchaseOrderRequest request, Long userId, String userRole) {
        String role = (userRole != null && !userRole.isBlank()) ? userRole.toUpperCase() : "ADMIN";
        log.info("Updating PO: {} | by role: {}", poId, role);

        if (!isAllowedToCreatePO(role)) {
            throw new RuntimeException(
                "Access denied: Role '" + role + "' cannot edit Purchase Orders."
            );
        }

        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase order not found: " + poId));

        if (po.getStatus() != POStatus.DRAFT) {
            throw new RuntimeException("Only DRAFT purchase orders can be updated");
        }

        po.setSupplierId(request.getSupplierId());
        po.setWarehouseId(request.getWarehouseId());
        po.setExpectedDate(request.getExpectedDate());
        po.setNotes(request.getNotes());
        po.setTermsAndConditions(request.getTermsAndConditions());
        if (request.getCreditTerms()    != null) po.setCreditTerms(request.getCreditTerms());
        if (request.getShipToAddress()  != null) po.setShipToAddress(request.getShipToAddress());
        if (request.getReceiveMaterials() != null) po.setReceiveMaterials(request.getReceiveMaterials());
        if (request.getPoDate()         != null) po.setPoDate(request.getPoDate());
        po.setUpdatedBy(userId);

        po.getLines().clear();
        List<PurchaseOrderLine> lines = request.getLines().stream()
                .map(lineReq -> PurchaseOrderLine.builder()
                        .purchaseOrder(po)
                        .productId(lineReq.getProductId())
                        .productName(lineReq.getProductName())
                        .sku(lineReq.getSku())
                        .qtyOrdered(lineReq.getQtyOrdered())
                        .qtyReceived(0)
                        .unitPrice(lineReq.getUnitPrice())
                        .notes(lineReq.getNotes())
                        .build())
                .collect(Collectors.toList());

        po.getLines().addAll(lines);
        po.calculateTotalAmount();

        return purchaseOrderRepository.save(po);
    }

    /**
     * Backward-compatible overload — no role
     */
    @Transactional
    public PurchaseOrder updatePurchaseOrder(Long poId, CreatePurchaseOrderRequest request, Long userId) {
        return updatePurchaseOrder(poId, request, userId, "ADMIN");
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    /**
     * Delete Purchase Order — only DRAFT POs can be deleted.
     */
    @Transactional
    public void deletePurchaseOrder(Long poId) {
        log.info("Deleting purchase order: {}", poId);

        PurchaseOrder po = purchaseOrderRepository.findById(poId)
                .orElseThrow(() -> new RuntimeException("Purchase order not found: " + poId));

        if (po.getStatus() != POStatus.DRAFT) {
            throw new RuntimeException("Only DRAFT purchase orders can be deleted");
        }

        purchaseOrderRepository.delete(po);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generatePONumber() {
        return "PO-" + System.currentTimeMillis();
    }
}
