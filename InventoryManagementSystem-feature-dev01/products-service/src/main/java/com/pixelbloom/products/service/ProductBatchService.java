package com.pixelbloom.products.service;

import com.pixelbloom.products.model.ProductBatch;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface ProductBatchService {

    // ── Batch CRUD ────────────────────────────────────────────────────────────
    ProductBatch createBatch(ProductBatch batch);
    ProductBatch updateBatch(Long id, ProductBatch batch);
    ProductBatch getBatchById(Long id);
    ProductBatch getBatchByNumber(String batchNumber);
    List<ProductBatch> getBatchesByProduct(Long productId);
    List<ProductBatch> getActiveBatchesByProduct(Long productId);
    void deleteBatch(Long id);
    void updateBatchStatus(Long id, String status);

    // ── Expiry Tracking ───────────────────────────────────────────────────────
    List<ProductBatch> getExpiringBatches(int daysAhead);
    List<ProductBatch> getExpiredBatches();

    // ── Bulk Import/Export ────────────────────────────────────────────────────
    /** Import products from CSV file */
    Map<String, Object> importProductsFromCsv(MultipartFile file);

    /** Import products from Excel file */
    Map<String, Object> importProductsFromExcel(MultipartFile file);

    /** Export all products to CSV bytes */
    byte[] exportProductsToCsv();

    /** Export all products to Excel bytes */
    byte[] exportProductsToExcel();

    /** Export products template CSV (empty with headers) */
    byte[] exportProductTemplate();

    /** Import batches from CSV */
    Map<String, Object> importBatchesFromCsv(MultipartFile file);

    /** Export batches for a product to CSV */
    byte[] exportBatchesToCsv(Long productId);
}
