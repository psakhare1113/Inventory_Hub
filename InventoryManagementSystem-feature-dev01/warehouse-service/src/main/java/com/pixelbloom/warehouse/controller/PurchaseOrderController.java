package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.client.EmailNotificationClient;
import com.pixelbloom.warehouse.client.SupplierClient;
import com.pixelbloom.warehouse.client.SupplierClient.SupplierDto;
import com.pixelbloom.warehouse.dto.CreatePurchaseOrderRequest;
import com.pixelbloom.warehouse.dto.PurchaseOrderResponse;
import com.pixelbloom.warehouse.enums.POStatus;
import com.pixelbloom.warehouse.model.PurchaseOrder;
import com.pixelbloom.warehouse.service.PurchaseOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Purchase Order Controller
 *
 * Role-based access via X-User-Role header:
 *
 *   CREATE / EDIT  → WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN
 *   APPROVE        → ADMIN, FINANCE_TEAM
 *   CANCEL         → ADMIN, PROCUREMENT, FINANCE_TEAM
 *   VIEW           → all authenticated users
 */
@RestController
@RequestMapping("/api/warehouse/purchase-orders")
@RequiredArgsConstructor
@Tag(name = "Purchase Orders", description = "Purchase Order Management APIs")
public class PurchaseOrderController {

    private final PurchaseOrderService  purchaseOrderService;
    private final SupplierClient        supplierClient;
    private final EmailNotificationClient emailNotificationClient;

    @Value("${receiving.clerk.email:psakhare1113@gmail.com}")
    private String receivingClerkEmail;

    // ── helpers ───────────────────────────────────────────────────────────────

    private PurchaseOrderResponse enrich(PurchaseOrder po) {
        try {
            SupplierDto supplier = supplierClient.getSupplierById(po.getSupplierId());
            String name    = supplier != null ? supplier.getName()    : "Supplier #" + po.getSupplierId();
            String company = supplier != null ? supplier.getCompany() : "";
            String phone   = supplier != null ? supplier.getPhone()   : "";
            return PurchaseOrderResponse.from(po, name, company, phone);
        } catch (Exception e) {
            return PurchaseOrderResponse.from(po, "Supplier #" + po.getSupplierId(), "", "");
        }
    }

    private List<PurchaseOrderResponse> enrichAll(List<PurchaseOrder> pos) {
        return pos.stream().map(this::enrich).collect(Collectors.toList());
    }

    // ── endpoints ─────────────────────────────────────────────────────────────

    /**
     * Create Purchase Order
     * Roles: WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN
     *
     * Warehouse Manager stock kami zali tar PO raise karto.
     * Procurement team supplier la officially PO pathavto.
     */
    @PostMapping
    @Operation(summary = "Create Purchase Order",
               description = "Create a new PO (FR-21). Allowed: WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN")
    public ResponseEntity<PurchaseOrderResponse> createPurchaseOrder(
            @Valid @RequestBody CreatePurchaseOrderRequest request,
            @RequestHeader(value = "X-User-Id",   required = false, defaultValue = "1")     Long userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "ADMIN") String userRole) {

        PurchaseOrder po = purchaseOrderService.createPurchaseOrder(request, userId, userRole);
        return ResponseEntity.status(HttpStatus.CREATED).body(enrich(po));
    }

    /**
     * Approve Purchase Order
     * Roles: ADMIN, FINANCE_TEAM only
     *
     * Finance/Admin budget check karto, mag APPROVED karto.
     * Warehouse Manager la email + WebSocket notification jato.
     */
    @PutMapping("/{poId}/approve")
    @Operation(summary = "Approve Purchase Order",
               description = "Approve a PO (FR-22). Only ADMIN and FINANCE_TEAM can approve.")
    public ResponseEntity<?> approvePurchaseOrder(
            @PathVariable Long poId,
            @RequestHeader(value = "X-User-Id",   required = false, defaultValue = "1")     Long userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "ADMIN") String userRole) {

        try {
            PurchaseOrder po = purchaseOrderService.approvePurchaseOrder(poId, userId, userRole);
            return ResponseEntity.ok(enrich(po));
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cancel Purchase Order
     * Roles: ADMIN, PROCUREMENT, FINANCE_TEAM
     */
    @PutMapping("/{poId}/cancel")
    @Operation(summary = "Cancel Purchase Order",
               description = "Cancel a PO. Allowed: ADMIN, PROCUREMENT, FINANCE_TEAM")
    public ResponseEntity<?> cancelPurchaseOrder(
            @PathVariable Long poId,
            @RequestHeader(value = "X-User-Id",   required = false, defaultValue = "1")     Long userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "ADMIN") String userRole) {

        try {
            PurchaseOrder po = purchaseOrderService.cancelPurchaseOrder(poId, userId, userRole);
            return ResponseEntity.ok(enrich(po));
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Update Purchase Order (DRAFT only)
     * Roles: WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN
     */
    @PutMapping("/{poId}")
    @Operation(summary = "Update Purchase Order",
               description = "Update a DRAFT PO. Allowed: WAREHOUSE_MANAGER, PROCUREMENT, INVENTORY_MANAGER, ADMIN")
    public ResponseEntity<?> updatePurchaseOrder(
            @PathVariable Long poId,
            @Valid @RequestBody CreatePurchaseOrderRequest request,
            @RequestHeader(value = "X-User-Id",   required = false, defaultValue = "1")     Long userId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "ADMIN") String userRole) {

        try {
            PurchaseOrder po = purchaseOrderService.updatePurchaseOrder(poId, request, userId, userRole);
            return ResponseEntity.ok(enrich(po));
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().startsWith("Access denied")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", e.getMessage()));
            }
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get Purchase Order by ID
     */
    @GetMapping("/{poId}")
    @Operation(summary = "Get Purchase Order by ID")
    public ResponseEntity<PurchaseOrderResponse> getPurchaseOrder(@PathVariable Long poId) {
        PurchaseOrder po = purchaseOrderService.getPurchaseOrderById(poId);
        return ResponseEntity.ok(enrich(po));
    }

    /**
     * Get all Purchase Orders
     */
    @GetMapping
    @Operation(summary = "Get All Purchase Orders")
    public ResponseEntity<List<PurchaseOrderResponse>> getAllPurchaseOrders() {
        return ResponseEntity.ok(enrichAll(purchaseOrderService.getAllPurchaseOrders()));
    }

    /**
     * Get POs by Status
     */
    @GetMapping("/status/{status}")
    @Operation(summary = "Get POs by Status")
    public ResponseEntity<List<PurchaseOrderResponse>> getPurchaseOrdersByStatus(@PathVariable POStatus status) {
        return ResponseEntity.ok(enrichAll(purchaseOrderService.getPurchaseOrdersByStatus(status)));
    }

    /**
     * Get POs by Supplier
     */
    @GetMapping("/supplier/{supplierId}")
    @Operation(summary = "Get POs by Supplier")
    public ResponseEntity<List<PurchaseOrderResponse>> getPurchaseOrdersBySupplier(@PathVariable Long supplierId) {
        return ResponseEntity.ok(enrichAll(purchaseOrderService.getPurchaseOrdersBySupplier(supplierId)));
    }

    /**
     * Delete Purchase Order (DRAFT only)
     */
    @DeleteMapping("/{poId}")
    @Operation(summary = "Delete Purchase Order", description = "Delete a DRAFT purchase order only")
    public ResponseEntity<Void> deletePurchaseOrder(@PathVariable Long poId) {
        purchaseOrderService.deletePurchaseOrder(poId);
        return ResponseEntity.noContent().build();
    }

    /**
     * PO Statistics
     */
    @GetMapping("/stats")
    @Operation(summary = "Get PO Statistics")
    public ResponseEntity<Map<String, Object>> getPurchaseOrderStats() {
        List<PurchaseOrder> allPos = purchaseOrderService.getAllPurchaseOrders();

        long totalOrders    = allPos.size();
        long pendingOrders  = allPos.stream().filter(po -> po.getStatus() == POStatus.DRAFT).count();
        long approvedOrders = allPos.stream().filter(po -> po.getStatus() == POStatus.APPROVED).count();
        long receivingOrders = allPos.stream().filter(po -> po.getStatus() == POStatus.RECEIVING).count();
        long closedOrders   = allPos.stream().filter(po -> po.getStatus() == POStatus.CLOSED).count();
        double totalValue   = allPos.stream()
                .mapToDouble(po -> po.getLines().stream()
                        .mapToDouble(line -> line.getQtyOrdered() * line.getUnitPrice().doubleValue())
                        .sum())
                .sum();

        return ResponseEntity.ok(Map.of(
                "totalOrders",    totalOrders,
                "pendingOrders",  pendingOrders,
                "approvedOrders", approvedOrders,
                "receivingOrders", receivingOrders,
                "closedOrders",   closedOrders,
                "totalValue",     totalValue
        ));
    }

    /**
     * Notify Receiving Clerk — called when Warehouse Manager clicks "📢 Notify Team"
     *
     * फक्त Receiving Clerk ला email जातो — बाकी कोणाला नाही.
     * In-app notification frontend मध्ये handle होतो.
     *
     * POST /api/warehouse/purchase-orders/{poId}/notify-receiving
     * Body: { "managerNote": "optional note" }
     */
    @PostMapping("/{poId}/notify-receiving")
    @Operation(summary = "Notify Receiving Clerk",
               description = "Sends email ONLY to Receiving Clerk. Called by Warehouse Manager on APPROVED POs.")
    public ResponseEntity<Map<String, String>> notifyReceivingClerk(
            @PathVariable Long poId,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            PurchaseOrder po = purchaseOrderService.getPurchaseOrderById(poId);

            if (po.getStatus() != POStatus.APPROVED) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Only APPROVED POs can trigger receiving notification. Current status: " + po.getStatus()
                ));
            }

            // Supplier name
            String supplierName = "Supplier #" + po.getSupplierId();
            try {
                SupplierDto supplier = supplierClient.getSupplierById(po.getSupplierId());
                if (supplier != null && supplier.getName() != null) {
                    supplierName = supplier.getName()
                        + (supplier.getCompany() != null ? " — " + supplier.getCompany() : "");
                }
            } catch (Exception ignored) { /* supplier fetch failed — use fallback */ }

            // Items list string: "T-Shirt: 500 units, Jeans: 200 units"
            String itemsList = po.getLines() == null || po.getLines().isEmpty()
                ? "N/A"
                : po.getLines().stream()
                    .map(l -> (l.getProductName() != null ? l.getProductName() : "Product #" + l.getProductId())
                              + ": " + l.getQtyOrdered() + " units")
                    .collect(java.util.stream.Collectors.joining(", "));

            String expectedDate  = po.getExpectedDate() != null ? po.getExpectedDate().toString() : "Not specified";
            String totalAmount   = po.getTotalAmount() != null ? "₹" + po.getTotalAmount().toPlainString() : "N/A";
            String managerNote   = (body != null && body.get("managerNote") != null && !body.get("managerNote").isBlank())
                ? body.get("managerNote")
                : "Please allocate space and prepare for receiving.";

            // Send email ONLY to Receiving Clerk
            emailNotificationClient.sendReceivingAlertEmail(
                receivingClerkEmail,
                po.getPoNumber(),
                supplierName,
                expectedDate,
                itemsList,
                totalAmount,
                managerNote
            );

            return ResponseEntity.ok(Map.of(
                "message", "✅ Receiving Clerk notified for PO " + po.getPoNumber(),
                "sentTo",  receivingClerkEmail,
                "poNumber", po.getPoNumber()
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to notify receiving clerk: " + e.getMessage()
            ));
        }
    }
}
