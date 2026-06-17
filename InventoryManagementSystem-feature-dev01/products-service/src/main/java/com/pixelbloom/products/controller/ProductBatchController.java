package com.pixelbloom.products.controller;

import com.pixelbloom.products.model.ProductBatch;
import com.pixelbloom.products.service.ProductBatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * ProductBatchController - Batch/Lot Tracking + Bulk Import/Export (FR-11, FR-12)
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductBatchController {

    private final ProductBatchService batchService;

    // ══════════════════════════════════════════════════════════════════════════
    // BATCH / LOT TRACKING (FR-11)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Create a new batch for a product
     * POST /api/products/batches
     */
    @PostMapping("/batches")
    public ResponseEntity<ProductBatch> createBatch(@RequestBody ProductBatch batch) {
        return ResponseEntity.ok(batchService.createBatch(batch));
    }

    /**
     * Get all batches for a product
     * GET /api/products/{productId}/batches
     */
    @GetMapping("/{productId}/batches")
    public ResponseEntity<List<ProductBatch>> getBatchesByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(batchService.getBatchesByProduct(productId));
    }

    /**
     * Get active batches for a product
     * GET /api/products/{productId}/batches/active
     */
    @GetMapping("/{productId}/batches/active")
    public ResponseEntity<List<ProductBatch>> getActiveBatches(@PathVariable Long productId) {
        return ResponseEntity.ok(batchService.getActiveBatchesByProduct(productId));
    }

    /**
     * Get batch by ID
     * GET /api/products/batches/{id}
     */
    @GetMapping("/batches/{id}")
    public ResponseEntity<ProductBatch> getBatchById(@PathVariable Long id) {
        return ResponseEntity.ok(batchService.getBatchById(id));
    }

    /**
     * Get batch by batch number
     * GET /api/products/batches/number/{batchNumber}
     */
    @GetMapping("/batches/number/{batchNumber}")
    public ResponseEntity<ProductBatch> getBatchByNumber(@PathVariable String batchNumber) {
        return ResponseEntity.ok(batchService.getBatchByNumber(batchNumber));
    }

    /**
     * Update batch
     * PUT /api/products/batches/{id}
     */
    @PutMapping("/batches/{id}")
    public ResponseEntity<ProductBatch> updateBatch(@PathVariable Long id, @RequestBody ProductBatch batch) {
        return ResponseEntity.ok(batchService.updateBatch(id, batch));
    }

    /**
     * Update batch status
     * PATCH /api/products/batches/{id}/status
     */
    @PatchMapping("/batches/{id}/status")
    public ResponseEntity<Void> updateBatchStatus(@PathVariable Long id, @RequestParam String status) {
        batchService.updateBatchStatus(id, status);
        return ResponseEntity.ok().build();
    }

    /**
     * Delete batch
     * DELETE /api/products/batches/{id}
     */
    @DeleteMapping("/batches/{id}")
    public ResponseEntity<Void> deleteBatch(@PathVariable Long id) {
        batchService.deleteBatch(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get expiring batches within N days
     * GET /api/products/batches/expiring?days=30
     */
    @GetMapping("/batches/expiring")
    public ResponseEntity<List<ProductBatch>> getExpiringBatches(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(batchService.getExpiringBatches(days));
    }

    /**
     * Get all expired batches
     * GET /api/products/batches/expired
     */
    @GetMapping("/batches/expired")
    public ResponseEntity<List<ProductBatch>> getExpiredBatches() {
        return ResponseEntity.ok(batchService.getExpiredBatches());
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BULK IMPORT / EXPORT (FR-12)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Import products from CSV file
     * POST /api/products/import/csv
     */
    @PostMapping("/import/csv")
    public ResponseEntity<Map<String, Object>> importProductsCsv(
            @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        return ResponseEntity.ok(batchService.importProductsFromCsv(file));
    }

    /**
     * Import products from Excel file
     * POST /api/products/import/excel
     */
    @PostMapping("/import/excel")
    public ResponseEntity<Map<String, Object>> importProductsExcel(
            @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        return ResponseEntity.ok(batchService.importProductsFromExcel(file));
    }

    /**
     * Export all products to CSV
     * GET /api/products/export/csv
     */
    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportProductsCsv() {
        byte[] data = batchService.exportProductsToCsv();
        String filename = "products_" + timestamp() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(data);
    }

    /**
     * Export all products to Excel
     * GET /api/products/export/excel
     */
    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportProductsExcel() {
        byte[] data = batchService.exportProductsToExcel();
        String filename = "products_" + timestamp() + ".xlsx";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    /**
     * Download product import template (CSV with headers)
     * GET /api/products/export/template
     */
    @GetMapping("/export/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        byte[] data = batchService.exportProductTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"product_import_template.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(data);
    }

    /**
     * Import batches from CSV
     * POST /api/products/batches/import/csv
     */
    @PostMapping("/batches/import/csv")
    public ResponseEntity<Map<String, Object>> importBatchesCsv(
            @RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
        }
        return ResponseEntity.ok(batchService.importBatchesFromCsv(file));
    }

    /**
     * Export batches to CSV
     * GET /api/products/batches/export/csv?productId=1
     */
    @GetMapping("/batches/export/csv")
    public ResponseEntity<byte[]> exportBatchesCsv(
            @RequestParam(required = false) Long productId) {
        byte[] data = batchService.exportBatchesToCsv(productId);
        String filename = "batches_" + (productId != null ? "product" + productId + "_" : "") + timestamp() + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(data);
    }

    private String timestamp() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
    }
}
