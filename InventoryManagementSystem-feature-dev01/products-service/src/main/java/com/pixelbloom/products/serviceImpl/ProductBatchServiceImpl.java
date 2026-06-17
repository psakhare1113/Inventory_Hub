package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.enums.ProductStatus;
import com.pixelbloom.products.exception.ResourceNotFoundException;
import com.pixelbloom.products.model.Product;
import com.pixelbloom.products.model.ProductBatch;
import com.pixelbloom.products.repository.ProductBatchRepository;
import com.pixelbloom.products.repository.ProductRepository;
import com.pixelbloom.products.service.ProductBatchService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ProductBatchServiceImpl implements ProductBatchService {

    private final ProductBatchRepository batchRepository;
    private final ProductRepository productRepository;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    // ── Batch CRUD ────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ProductBatch createBatch(ProductBatch batch) {
        if (batchRepository.existsByProductIdAndBatchNumber(batch.getProductId(), batch.getBatchNumber())) {
            throw new IllegalArgumentException("Batch number already exists for this product: " + batch.getBatchNumber());
        }
        return batchRepository.save(batch);
    }

    @Override
    @Transactional
    public ProductBatch updateBatch(Long id, ProductBatch updated) {
        ProductBatch existing = getBatchById(id);
        existing.setBatchNumber(updated.getBatchNumber());
        existing.setLotNumber(updated.getLotNumber());
        existing.setManufacturingDate(updated.getManufacturingDate());
        existing.setExpiryDate(updated.getExpiryDate());
        existing.setQuantity(updated.getQuantity());
        existing.setUnitCost(updated.getUnitCost());
        existing.setSupplierId(updated.getSupplierId());
        existing.setSupplierBatchRef(updated.getSupplierBatchRef());
        existing.setStatus(updated.getStatus());
        existing.setNotes(updated.getNotes());
        return batchRepository.save(existing);
    }

    @Override
    public ProductBatch getBatchById(Long id) {
        return batchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with id: " + id));
    }

    @Override
    public ProductBatch getBatchByNumber(String batchNumber) {
        return batchRepository.findByBatchNumber(batchNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found: " + batchNumber));
    }

    @Override
    public List<ProductBatch> getBatchesByProduct(Long productId) {
        return batchRepository.findByProductIdOrderByExpiryDateAsc(productId);
    }

    @Override
    public List<ProductBatch> getActiveBatchesByProduct(Long productId) {
        return batchRepository.findByProductIdAndStatus(productId, "ACTIVE");
    }

    @Override
    @Transactional
    public void deleteBatch(Long id) {
        if (!batchRepository.existsById(id)) {
            throw new ResourceNotFoundException("Batch not found with id: " + id);
        }
        batchRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void updateBatchStatus(Long id, String status) {
        ProductBatch batch = getBatchById(id);
        batch.setStatus(status);
        batchRepository.save(batch);
    }

    // ── Expiry Tracking ───────────────────────────────────────────────────────

    @Override
    public List<ProductBatch> getExpiringBatches(int daysAhead) {
        LocalDate cutoff = LocalDate.now().plusDays(daysAhead);
        return batchRepository.findExpiringBefore(cutoff);
    }

    @Override
    public List<ProductBatch> getExpiredBatches() {
        return batchRepository.findExpiringBefore(LocalDate.now());
    }

    // ── Bulk Import/Export ────────────────────────────────────────────────────

    @Override
    @Transactional
    public Map<String, Object> importProductsFromCsv(MultipartFile file) {
        int success = 0, failed = 0;
        List<String> errors = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine(); // skip header
            if (headerLine == null) {
                return Map.of("success", 0, "failed", 0, "errors", List.of("Empty file"));
            }

            String line;
            int row = 1;
            while ((line = reader.readLine()) != null) {
                row++;
                if (line.trim().isEmpty()) continue;
                try {
                    String[] cols = parseCsvLine(line);
                    if (cols.length < 5) {
                        errors.add("Row " + row + ": Insufficient columns (need at least 5)");
                        failed++;
                        continue;
                    }

                    Product product = new Product();
                    product.setProductBarcode(cols[0].trim());
                    product.setName(cols[1].trim());
                    product.setDescription(cols.length > 2 ? cols[2].trim() : "");
                    product.setCategoryId(Long.parseLong(cols[3].trim()));
                    product.setSubcategoryId(Long.parseLong(cols[4].trim()));
                    product.setStatus(ProductStatus.ACTIVE);
                    product.setProductUrl(cols.length > 5 ? cols[5].trim() : "");
                    product.setEligibleForReturn(cols.length > 6 ? Boolean.parseBoolean(cols[6].trim()) : true);

                    productRepository.save(product);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + row + ": " + e.getMessage());
                    failed++;
                }
            }
        } catch (IOException e) {
            return Map.of("success", 0, "failed", 1, "errors", List.of("File read error: " + e.getMessage()));
        }

        return Map.of("success", success, "failed", failed, "errors", errors,
                "message", success + " products imported successfully");
    }

    @Override
    @Transactional
    public Map<String, Object> importProductsFromExcel(MultipartFile file) {
        int success = 0, failed = 0;
        List<String> errors = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) {
                return Map.of("success", 0, "failed", 0, "errors", List.of("Empty file"));
            }
            rows.next(); // skip header row

            while (rows.hasNext()) {
                Row row = rows.next();
                if (isRowEmpty(row)) continue;
                try {
                    Product product = new Product();
                    product.setProductBarcode(getCellString(row, 0));
                    product.setName(getCellString(row, 1));
                    product.setDescription(getCellString(row, 2));
                    product.setCategoryId(getCellLong(row, 3));
                    product.setSubcategoryId(getCellLong(row, 4));
                    product.setStatus(ProductStatus.ACTIVE);
                    product.setProductUrl(getCellString(row, 5));
                    product.setEligibleForReturn(getCellBoolean(row, 6));

                    productRepository.save(product);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": " + e.getMessage());
                    failed++;
                }
            }
        } catch (IOException e) {
            return Map.of("success", 0, "failed", 1, "errors", List.of("File read error: " + e.getMessage()));
        }

        return Map.of("success", success, "failed", failed, "errors", errors,
                "message", success + " products imported successfully");
    }

    @Override
    public byte[] exportProductsToCsv() {
        List<Product> products = productRepository.findAll();
        StringBuilder sb = new StringBuilder();

        // Header
        sb.append("productId,productBarcode,name,description,categoryId,subcategoryId,status,productUrl,eligibleForReturn,createdAt\n");

        // Data rows
        for (Product p : products) {
            sb.append(safe(p.getProductId())).append(",")
              .append(safe(p.getProductBarcode())).append(",")
              .append(escapeCsv(p.getName())).append(",")
              .append(escapeCsv(p.getDescription())).append(",")
              .append(safe(p.getCategoryId())).append(",")
              .append(safe(p.getSubcategoryId())).append(",")
              .append(safe(p.getStatus())).append(",")
              .append(escapeCsv(p.getProductUrl())).append(",")
              .append(p.isEligibleForReturn()).append(",")
              .append(safe(p.getCreatedAt())).append("\n");
        }

        return sb.toString().getBytes();
    }

    @Override
    public byte[] exportProductsToExcel() {
        List<Product> products = productRepository.findAll();

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Products");

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Header row
            String[] headers = {"Product ID", "Barcode", "Name", "Description",
                    "Category ID", "Subcategory ID", "Status", "Product URL",
                    "Eligible For Return", "Created At"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 5000);
            }

            // Data rows
            int rowNum = 1;
            for (Product p : products) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(p.getProductId() != null ? p.getProductId() : 0);
                row.createCell(1).setCellValue(safe(p.getProductBarcode()));
                row.createCell(2).setCellValue(safe(p.getName()));
                row.createCell(3).setCellValue(safe(p.getDescription()));
                row.createCell(4).setCellValue(p.getCategoryId() != null ? p.getCategoryId() : 0);
                row.createCell(5).setCellValue(p.getSubcategoryId() != null ? p.getSubcategoryId() : 0);
                row.createCell(6).setCellValue(p.getStatus() != null ? p.getStatus().name() : "");
                row.createCell(7).setCellValue(safe(p.getProductUrl()));
                row.createCell(8).setCellValue(p.isEligibleForReturn());
                row.createCell(9).setCellValue(p.getCreatedAt() != null ? p.getCreatedAt().toString() : "");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to generate Excel: " + e.getMessage());
        }
    }

    @Override
    public byte[] exportProductTemplate() {
        StringBuilder sb = new StringBuilder();
        sb.append("productBarcode,name,description,categoryId,subcategoryId,productUrl,eligibleForReturn\n");
        sb.append("BARCODE001,Sample Product,Product description,1,1,https://example.com/image.jpg,true\n");
        return sb.toString().getBytes();
    }

    @Override
    @Transactional
    public Map<String, Object> importBatchesFromCsv(MultipartFile file) {
        int success = 0, failed = 0;
        List<String> errors = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine(); // skip header
            if (headerLine == null) {
                return Map.of("success", 0, "failed", 0, "errors", List.of("Empty file"));
            }

            String line;
            int row = 1;
            while ((line = reader.readLine()) != null) {
                row++;
                if (line.trim().isEmpty()) continue;
                try {
                    String[] cols = parseCsvLine(line);
                    if (cols.length < 3) {
                        errors.add("Row " + row + ": Need at least productId, batchNumber, quantity");
                        failed++;
                        continue;
                    }

                    ProductBatch batch = ProductBatch.builder()
                            .productId(Long.parseLong(cols[0].trim()))
                            .batchNumber(cols[1].trim())
                            .lotNumber(cols.length > 2 ? cols[2].trim() : null)
                            .quantity(cols.length > 3 ? Integer.parseInt(cols[3].trim()) : 0)
                            .manufacturingDate(cols.length > 4 && !cols[4].trim().isEmpty()
                                    ? LocalDate.parse(cols[4].trim(), DATE_FMT) : null)
                            .expiryDate(cols.length > 5 && !cols[5].trim().isEmpty()
                                    ? LocalDate.parse(cols[5].trim(), DATE_FMT) : null)
                            .unitCost(cols.length > 6 && !cols[6].trim().isEmpty()
                                    ? new BigDecimal(cols[6].trim()) : null)
                            .status("ACTIVE")
                            .build();

                    batchRepository.save(batch);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + row + ": " + e.getMessage());
                    failed++;
                }
            }
        } catch (IOException e) {
            return Map.of("success", 0, "failed", 1, "errors", List.of("File read error: " + e.getMessage()));
        }

        return Map.of("success", success, "failed", failed, "errors", errors,
                "message", success + " batches imported successfully");
    }

    @Override
    public byte[] exportBatchesToCsv(Long productId) {
        List<ProductBatch> batches = productId != null
                ? batchRepository.findByProductIdOrderByExpiryDateAsc(productId)
                : batchRepository.findAll();

        StringBuilder sb = new StringBuilder();
        sb.append("id,productId,batchNumber,lotNumber,quantity,manufacturingDate,expiryDate,unitCost,supplierId,status,notes\n");

        for (ProductBatch b : batches) {
            sb.append(safe(b.getId())).append(",")
              .append(safe(b.getProductId())).append(",")
              .append(safe(b.getBatchNumber())).append(",")
              .append(safe(b.getLotNumber())).append(",")
              .append(safe(b.getQuantity())).append(",")
              .append(safe(b.getManufacturingDate())).append(",")
              .append(safe(b.getExpiryDate())).append(",")
              .append(safe(b.getUnitCost())).append(",")
              .append(safe(b.getSupplierId())).append(",")
              .append(safe(b.getStatus())).append(",")
              .append(escapeCsv(b.getNotes())).append("\n");
        }

        return sb.toString().getBytes();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String[] parseCsvLine(String line) {
        List<String> result = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();
        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        result.add(current.toString());
        return result.toArray(new String[0]);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    private String safe(Object value) {
        return value != null ? value.toString() : "";
    }

    private String getCellString(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private Long getCellLong(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return 0L;
        return switch (cell.getCellType()) {
            case NUMERIC -> (long) cell.getNumericCellValue();
            case STRING -> Long.parseLong(cell.getStringCellValue().trim());
            default -> 0L;
        };
    }

    private boolean getCellBoolean(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return true;
        return switch (cell.getCellType()) {
            case BOOLEAN -> cell.getBooleanCellValue();
            case STRING -> Boolean.parseBoolean(cell.getStringCellValue().trim());
            default -> true;
        };
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (Cell cell : row) {
            if (cell != null && cell.getCellType() != CellType.BLANK) return false;
        }
        return true;
    }
}
