package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.client.EmailNotificationClient;
import com.pixelbloom.warehouse.client.InventoryClient;
import com.pixelbloom.warehouse.client.InventoryClient.AddStockRequest;
import com.pixelbloom.warehouse.client.ProductClient;
import com.pixelbloom.warehouse.client.ProductClient.ProductDto;
import com.pixelbloom.warehouse.client.ProductClient.PricingDto;
import com.pixelbloom.warehouse.dto.CreateGRNRequest;
import com.pixelbloom.warehouse.enums.GRNStatus;
import com.pixelbloom.warehouse.model.*;
import com.pixelbloom.warehouse.repository.GoodsReceiptNoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Goods Receipt Service (FR-30 to FR-33)
 *
 * Key integration point:
 *   completePutaway() → calls inventory-service to add accepted stock units
 *                     → Admin ला email + WebSocket notification पाठवतो
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GoodsReceiptService {

    private final GoodsReceiptNoteRepository grnRepository;
    private final PurchaseOrderService       purchaseOrderService;
    private final PutawayService             putawayService;
    private final InventoryClient            inventoryClient;
    private final ProductClient              productClient;
    private final WarehouseEventPublisher    eventPublisher;
    private final EmailNotificationClient    emailNotificationClient;

    @Value("${admin.email:psakhare1113@gmail.com}")
    private String adminEmail;

    // ── Create GRN (FR-30, FR-31) ─────────────────────────────────────────────

    @Transactional
    public GoodsReceiptNote createGRN(CreateGRNRequest request, Long receivedBy) {
        log.info("Creating GRN for PO: {}", request.getPoId());

        PurchaseOrder po = purchaseOrderService.getPurchaseOrderById(request.getPoId());

        String grnNumber = generateGRNNumber();

        GoodsReceiptNote grn = GoodsReceiptNote.builder()
                .grnNumber(grnNumber)
                .poId(request.getPoId())
                .warehouseId(request.getWarehouseId())
                .status(GRNStatus.PENDING)
                .receivedAt(LocalDateTime.now())
                .receivedBy(receivedBy)
                .notes(request.getNotes())
                .putawayCompleted(false)
                .build();

        List<GRNLine> lines = request.getLines().stream()
                .map(lineReq -> {
                    GRNLine line = GRNLine.builder()
                            .grn(grn)
                            .poLineId(lineReq.getPoLineId())
                            .productId(lineReq.getProductId())
                            .qtyReceived(lineReq.getQtyReceived())
                            .qtyAccepted(lineReq.getQtyAccepted())
                            .qtyRejected(lineReq.getQtyRejected())
                            .lotNumber(lineReq.getLotNumber())
                            .batchNumber(lineReq.getBatchNumber())
                            .expirationDate(lineReq.getExpirationDate())
                            .condition(lineReq.getCondition())
                            .notes(lineReq.getNotes())
                            .putawayCompleted(false)
                            .build();

                    Long suggestedLocation = putawayService.suggestPutawayLocation(
                            request.getWarehouseId(), lineReq.getProductId());
                    line.setSuggestedLocationId(suggestedLocation);

                    return line;
                })
                .collect(Collectors.toList());

        grn.setLines(lines);

        updatePOLineReceivedQty(po, request.getLines());
        purchaseOrderService.updateReceivingStatus(request.getPoId());

        GoodsReceiptNote savedGRN = grnRepository.save(grn);
        log.info("GRN created: {}", grnNumber);

        // 🔔 WebSocket — Admin + Warehouse Manager ला instant notification
        java.util.Map<String, Object> grnData = new java.util.HashMap<>();
        grnData.put("grnId", savedGRN.getId());
        grnData.put("grnNumber", grnNumber);
        grnData.put("poId", request.getPoId());
        grnData.put("warehouseId", request.getWarehouseId());
        eventPublisher.notifyAll("GRN_CREATED",
                "📦 GRN Created: " + grnNumber,
                "Goods received against PO #" + request.getPoId() + ". Inspection pending.",
                grnData);

        return savedGRN;
    }

    // ── Complete quality inspection (FR-31) ───────────────────────────────────

    @Transactional
    public GoodsReceiptNote completeInspection(Long grnId, Long inspectedBy, String notes) {
        log.info("Completing inspection for GRN: {}", grnId);

        GoodsReceiptNote grn = grnRepository.findById(grnId)
                .orElseThrow(() -> new RuntimeException("GRN not found: " + grnId));

        if (grn.getStatus() != GRNStatus.PENDING) {
            throw new RuntimeException("Only PENDING GRNs can be inspected");
        }

        grn.setStatus(GRNStatus.INSPECTED);
        grn.setInspectedBy(inspectedBy);
        grn.setInspectedAt(LocalDateTime.now());
        grn.setInspectionNotes(notes);

        return grnRepository.save(grn);
    }

    // ── Complete putaway for a GRN line (FR-33) ───────────────────────────────
    //
    //  After putaway is confirmed, we push each accepted unit into inventory-service
    //  so that the stock becomes AVAILABLE for customer orders.
    //
    //  One inventory row = one physical unit (barcode-level tracking).
    //  Barcode format: GRN-{grnNumber}-P{productId}-{unitIndex}

    @Transactional
    public void completePutaway(Long grnId, Long lineId, Long actualLocationId) {
        log.info("Completing putaway for GRN line: {}", lineId);

        GoodsReceiptNote grn = grnRepository.findById(grnId)
                .orElseThrow(() -> new RuntimeException("GRN not found: " + grnId));

        GRNLine line = grn.getLines().stream()
                .filter(l -> l.getId().equals(lineId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("GRN line not found: " + lineId));

        line.setActualLocationId(actualLocationId);
        line.setPutawayCompleted(true);

        // ── Push accepted units to inventory-service ──────────────────────────
        pushToInventory(grn, line);

        // ── Update GRN status ─────────────────────────────────────────────────
        if (grn.isAllLinesPutaway()) {
            grn.setPutawayCompleted(true);
            grn.setPutawayCompletedAt(LocalDateTime.now());
            grn.setStatus(GRNStatus.COMPLETED);
        } else {
            grn.setStatus(GRNStatus.PUTAWAY);
        }

        grnRepository.save(grn);

        // ── Admin ला notify करा — inventory updated ───────────────────────────
        notifyAdminInventoryUpdated(grn, line);
    }

    /**
     * Admin ला email + WebSocket notification पाठवतो.
     * Receiving Clerk ने putaway complete केल्यावर inventory add होतो तेव्हाच call होतो.
     * फक्त Admin ला — बाकी कोणाला नाही.
     */
    private void notifyAdminInventoryUpdated(GoodsReceiptNote grn, GRNLine line) {
        int qtyAdded = line.getQtyAccepted() != null ? line.getQtyAccepted() : 0;
        if (qtyAdded <= 0) return;

        // Product name — ProductClient कडून घे, fallback to "Product #id"
        String productName;
        try {
            ProductDto p = productClient.getProductById(line.getProductId());
            productName = (p != null && p.getName() != null) ? p.getName() : "Product #" + line.getProductId();
        } catch (Exception e) {
            productName = "Product #" + line.getProductId();
        }

        final String finalProductName = productName;

        // 1. WebSocket — Admin ला real-time notification
        try {
            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("productId",   line.getProductId());
            data.put("productName", finalProductName);
            data.put("qtyAdded",    qtyAdded);
            data.put("grnNumber",   grn.getGrnNumber());
            data.put("warehouseId", grn.getWarehouseId());
            data.put("condition",   line.getCondition());

            eventPublisher.notifyAdmin(
                "INVENTORY_UPDATED",
                "📦 Inventory Updated: " + finalProductName,
                "+" + qtyAdded + " units added to stock from GRN " + grn.getGrnNumber()
                    + ". Condition: " + (line.getCondition() != null ? line.getCondition() : "GOOD"),
                data
            );
        } catch (Exception e) {
            log.warn("WebSocket notification failed for inventory update: {}", e.getMessage());
        }

        // 2. Email — Admin ला
        try {
            emailNotificationClient.sendInventoryUpdatedEmail(
                adminEmail,
                finalProductName,
                line.getProductId(),
                qtyAdded,
                grn.getGrnNumber(),
                grn.getWarehouseId(),
                line.getCondition() != null ? line.getCondition() : "GOOD"
            );
        } catch (Exception e) {
            log.warn("Email notification failed for inventory update: {}", e.getMessage());
        }
    }

    /**
     * Push each accepted unit of a GRN line into inventory-service.
     *
     * Amazon-style flow:
     *   1. Fetch product master data (categoryId, subcategoryId) from products-service
     *   2. Fetch pricing (MRP, selling price) from products-service
     *   3. Insert one inventory row per accepted unit with unique barcode
     *
     * Example: qtyAccepted = 3, productId = 5, grnNumber = "GRN-1234"
     *   → barcodes: GRN-1234-P5-1, GRN-1234-P5-2, GRN-1234-P5-3
     *   → each row: AVAILABLE, category from catalog, pricing from catalog
     */
    private void pushToInventory(GoodsReceiptNote grn, GRNLine line) {
        int accepted = line.getQtyAccepted() != null ? line.getQtyAccepted() : 0;
        if (accepted <= 0) {
            log.info("No accepted qty for GRN line {}, skipping inventory push", line.getId());
            return;
        }

        // ── Step 1: Fetch product master data from products-service ───────────
        ProductDto product = productClient.getProductById(line.getProductId());
        Long categoryId    = (product != null && product.getCategoryId() != null)
                             ? product.getCategoryId() : 0L;
        Long subcategoryId = (product != null && product.getSubcategoryId() != null)
                             ? product.getSubcategoryId() : 0L;
        log.info("Product {} → categoryId={}, subcategoryId={}", line.getProductId(), categoryId, subcategoryId);

        // ── Step 2: Fetch pricing from products-service ───────────────────────
        PricingDto pricing   = productClient.getPricingByProductId(line.getProductId());
        BigDecimal mrp           = (pricing != null && pricing.getMrp() != null)
                                   ? pricing.getMrp() : BigDecimal.ZERO;
        BigDecimal sellingPrice  = (pricing != null && pricing.getSellingPrice() != null)
                                   ? pricing.getSellingPrice() : BigDecimal.ZERO;
        BigDecimal showroomPrice = sellingPrice; // no separate showroom price in products-service
        BigDecimal buyPrice      = (pricing != null && pricing.getCostPrice() != null)
                                   ? pricing.getCostPrice() : BigDecimal.ZERO;
        log.info("Product {} → mrp={}, sellingPrice={}", line.getProductId(), mrp, sellingPrice);

        String conditionStatus = mapCondition(line.getCondition());

        // ── Step 3: Insert one row per accepted unit ──────────────────────────
        for (int i = 1; i <= accepted; i++) {
            String barcode = grn.getGrnNumber() + "-P" + line.getProductId() + "-" + i;

            AddStockRequest req = AddStockRequest.builder()
                    .barcode(barcode)
                    .productId(line.getProductId())
                    .categoryId(categoryId)
                    .subcategoryId(subcategoryId)
                    .warehouseId(grn.getWarehouseId())
                    .inventoryStatus("AVAILABLE")
                    .platformStatus("ENABLED")
                    .conditionStatus(conditionStatus)
                    .mrp(mrp)
                    .showroomPrice(showroomPrice)
                    .buyPrice(buyPrice)
                    .sellingPrice(sellingPrice)
                    .stockSource("SUPPLIER")
                    .isCustomerReturned(false)
                    .isWarehouseDamaged("WAREHOUSE_DAMAGED".equals(conditionStatus))
                    .createdBy(grn.getReceivedBy())
                    .build();

            boolean success = inventoryClient.addStock(req);
            if (success) {
                log.info("✅ Stock added: barcode={}, product={}, category={}, mrp={}",
                        barcode, line.getProductId(), categoryId, mrp);
            } else {
                log.warn("❌ Failed to add stock for barcode={} — inventory-service may be down", barcode);
            }
        }
    }

    /** Map GRN condition string to inventory-service ConditionStatus enum value */
    private String mapCondition(String grnCondition) {
        if (grnCondition == null) return "GOOD";
        return switch (grnCondition.toUpperCase()) {
            case "DAMAGED"   -> "WAREHOUSE_DAMAGED";
            case "DEFECTIVE" -> "WAREHOUSE_DAMAGED";
            default          -> "GOOD";
        };
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public GoodsReceiptNote getGRNById(Long grnId) {
        return grnRepository.findById(grnId)
                .orElseThrow(() -> new RuntimeException("GRN not found: " + grnId));
    }

    public List<GoodsReceiptNote> getPendingPutawayGRNs() {
        return grnRepository.findPendingPutaway();
    }

    public List<GoodsReceiptNote> getAllGRNs() {
        return grnRepository.findAll();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void updatePOLineReceivedQty(PurchaseOrder po, List<CreateGRNRequest.GRNLineRequest> grnLines) {
        grnLines.forEach(grnLine -> {
            PurchaseOrderLine poLine = po.getLines().stream()
                    .filter(l -> l.getId().equals(grnLine.getPoLineId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("PO line not found: " + grnLine.getPoLineId()));

            poLine.setQtyReceived(poLine.getQtyReceived() + grnLine.getQtyAccepted());
        });
    }

    private String generateGRNNumber() {
        return "GRN-" + System.currentTimeMillis();
    }
}
