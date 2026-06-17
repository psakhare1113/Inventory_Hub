package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.client.InventoryClient;
import com.pixelbloom.warehouse.dto.CreatePurchaseOrderRequest;
import com.pixelbloom.warehouse.enums.POStatus;
import com.pixelbloom.warehouse.model.ProductThreshold;
import com.pixelbloom.warehouse.model.PurchaseOrder;
import com.pixelbloom.warehouse.model.PurchaseOrderLine;
import com.pixelbloom.warehouse.repository.ProductThresholdRepository;
import com.pixelbloom.warehouse.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * AutoPOService — Automatic Purchase Order System 🤖
 *
 * Flow:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Every 1 hour (configurable):                               │
 * │                                                             │
 * │  1. Fetch all enabled products from product_thresholds table  │
 * │  2. Query inventory-service for current stock of each product │
 * │     (GET /api/inventory/stock/product-count)                  │
 * │  3. If stock < lowStockThreshold:                             │
 * │       → Check: is there already an auto PO in last 24 hours? │
 * │       → If not: create a DRAFT PO                            │
 * │       → Send notification to Warehouse Manager               │
 * │  4. Manager approves PO → APPROVED → sent to Supplier        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Example:
 *   T-Shirt (productId=101) threshold=50, reorderQty=500
 *   Current stock = 20 → 20 < 50 → Auto PO created!
 *   PO: T-Shirt × 500 units, Status=DRAFT
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AutoPOService {

    private final ProductThresholdRepository thresholdRepository;
    private final PurchaseOrderRepository    purchaseOrderRepository;
    private final InventoryClient            inventoryClient;
    private final WarehouseEventPublisher    eventPublisher;

    /**
     * Scheduled job — runs every 1 hour.
     * cron = "0 0 * * * *" → at the first minute of every hour
     *
     * For development: "0 * * * * *" → every 1 minute (testing)
     * For production:  "0 0 * * * *" → every 1 hour
     */
    @Scheduled(cron = "${auto.po.cron:0 0 * * * *}")
    @Transactional
    public void checkAndCreateAutoPOs() {
        log.info("🤖 Auto PO Scheduler started — checking stock levels...");

        List<ProductThreshold> thresholds = thresholdRepository.findByAutoPOEnabledTrue();

        if (thresholds.isEmpty()) {
            log.info("No product thresholds configured. Skipping auto PO check.");
            return;
        }

        int created = 0;
        int skipped = 0;

        for (ProductThreshold threshold : thresholds) {
            try {
                boolean poCreated = processThreshold(threshold);
                if (poCreated) created++;
                else skipped++;
            } catch (Exception e) {
                log.error("❌ Error processing threshold for product {}: {}",
                        threshold.getProductId(), e.getMessage());
            }
        }

        log.info("🤖 Auto PO Scheduler done — Created: {}, Skipped: {}", created, skipped);
    }

    /**
     * Checks stock for a single product and creates a PO if needed.
     * @return true if a PO was created
     */
    private boolean processThreshold(ProductThreshold threshold) {
        Long productId   = threshold.getProductId();
        Long warehouseId = threshold.getWarehouseId();

        // 1. Fetch current stock from inventory-service
        long currentStock = inventoryClient.getAvailableStock(productId);

        if (currentStock == -1L) {
            log.warn("⚠️ Inventory service unreachable for product {}. Skipping.", productId);
            return false;
        }

        log.debug("Product {} | Current Stock: {} | Threshold: {}",
                productId, currentStock, threshold.getLowStockThreshold());

        // 2. Stock is above threshold — no PO needed
        if (currentStock >= threshold.getLowStockThreshold()) {
            return false;
        }

        // 3. Was an auto PO already created in the last 24 hours?
        if (threshold.getLastAutoPOCreatedAt() != null &&
            threshold.getLastAutoPOCreatedAt().isAfter(LocalDateTime.now().minusHours(24))) {
            log.info("⏭️ Auto PO already created in last 24h for product {}. Skipping.", productId);
            return false;
        }

        // 4. Is a supplier configured?
        if (threshold.getDefaultSupplierId() == null) {
            log.warn("⚠️ No default supplier configured for product {}. Cannot create auto PO.", productId);
            return false;
        }

        // 5. Create Auto PO
        log.info("🚨 LOW STOCK: Product {} | Stock={} < Threshold={} → Creating Auto PO...",
                productId, currentStock, threshold.getLowStockThreshold());

        PurchaseOrder po = createAutoPO(threshold, currentStock);

        // 6. Update lastAutoPOCreatedAt — to prevent duplicates
        threshold.setLastAutoPOCreatedAt(LocalDateTime.now());
        thresholdRepository.save(threshold);

        // 7. WebSocket notification to Warehouse Manager
        try {
            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("poId",        po.getId());
            data.put("poNumber",    po.getPoNumber());
            data.put("productId",   productId);
            data.put("productName", threshold.getProductName());
            data.put("currentStock", currentStock);
            data.put("threshold",   threshold.getLowStockThreshold());
            data.put("reorderQty",  threshold.getReorderQty());

            eventPublisher.notifyAll(
                "AUTO_PO_CREATED",
                "🤖 Auto PO: " + (threshold.getProductName() != null ? threshold.getProductName() : "Product #" + productId),
                "Stock=" + currentStock + " < Threshold=" + threshold.getLowStockThreshold()
                    + ". Auto PO " + po.getPoNumber() + " created. Please review & approve.",
                data
            );
        } catch (Exception e) {
            log.warn("WebSocket notification failed for auto PO: {}", e.getMessage());
        }

        log.info("✅ Auto PO created: {} for product {} (stock={}, ordered={})",
                po.getPoNumber(), productId, currentStock, threshold.getReorderQty());

        return true;
    }

    /**
     * Creates a DRAFT PO — on behalf of system user (id=0).
     */
    private PurchaseOrder createAutoPO(ProductThreshold threshold, long currentStock) {
        String poNumber = "AUTO-PO-" + System.currentTimeMillis();

        PurchaseOrder po = PurchaseOrder.builder()
                .poNumber(poNumber)
                .supplierId(threshold.getDefaultSupplierId())
                .warehouseId(threshold.getWarehouseId())
                .status(POStatus.DRAFT)
                .expectedDate(LocalDate.now().plusDays(7)) // default: 7 days delivery
                .notes("🤖 AUTO-GENERATED: Stock=" + currentStock
                        + " fell below threshold=" + threshold.getLowStockThreshold()
                        + ". Please review and approve.")
                .requestedByRole("SYSTEM")
                .createdBy(0L)  // 0 = system
                .updatedBy(0L)
                .build();

        // PO line — reorderQty units
        PurchaseOrderLine line = PurchaseOrderLine.builder()
                .purchaseOrder(po)
                .productId(threshold.getProductId())
                .productName(threshold.getProductName() != null
                        ? threshold.getProductName()
                        : "Product #" + threshold.getProductId())
                .sku("")
                .qtyOrdered(threshold.getReorderQty())
                .qtyReceived(0)
                .unitPrice(threshold.getUnitPrice() != null
                        ? threshold.getUnitPrice()
                        : java.math.BigDecimal.ONE)
                .notes("Auto-generated line")
                .build();

        po.setLines(List.of(line));
        po.calculateTotalAmount();

        return purchaseOrderRepository.save(po);
    }

    // ── Manual trigger (for testing / admin button) ───────────────────────────

    /**
     * Can be manually triggered by Admin or Warehouse Manager.
     * POST /api/warehouse/auto-po/trigger
     */
    public String manualTrigger() {
        log.info("🔧 Manual Auto PO trigger requested");
        checkAndCreateAutoPOs();
        return "Auto PO check completed";
    }

    /**
     * Manual check for a specific product.
     */
    @Transactional
    public String checkProduct(Long productId, Long warehouseId) {
        ProductThreshold threshold = thresholdRepository
                .findByProductIdAndWarehouseId(productId, warehouseId)
                .orElseThrow(() -> new RuntimeException(
                        "No threshold configured for product " + productId + " in warehouse " + warehouseId));

        boolean created = processThreshold(threshold);
        long stock = inventoryClient.getAvailableStock(productId);

        return created
                ? "✅ Auto PO created! Current stock=" + stock + " < threshold=" + threshold.getLowStockThreshold()
                : "ℹ️ No PO needed. Current stock=" + stock + " >= threshold=" + threshold.getLowStockThreshold();
    }
}
