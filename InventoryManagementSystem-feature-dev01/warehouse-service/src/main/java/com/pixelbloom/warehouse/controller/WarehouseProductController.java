package com.pixelbloom.warehouse.controller;

import com.pixelbloom.warehouse.client.ProductClient;
import com.pixelbloom.warehouse.client.ProductClient.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * WarehouseProductController
 *
 * Warehouse service चा स्वतःचा product proxy endpoint.
 * Warehouse frontend (WarehouseDashboard) हे endpoints वापरतो —
 * products-service ला directly call करण्याची गरज नाही.
 *
 * Endpoints:
 *   GET /api/warehouse/products              → सगळे products (PO create dropdown)
 *   GET /api/warehouse/products/{id}         → single product
 *   GET /api/warehouse/categories            → सगळ्या categories
 *   GET /api/warehouse/subcategories         → सगळ्या subcategories
 *   GET /api/warehouse/suppliers             → सगळे suppliers (PO create dropdown)
 *   GET /api/warehouse/suppliers/{id}        → single supplier
 *   GET /api/warehouse/products/{id}/pricing → product pricing
 */
@RestController
@RequestMapping("/api/warehouse")
@RequiredArgsConstructor
@Tag(name = "Warehouse Products", description = "Product catalog proxy for Warehouse Dashboard")
public class WarehouseProductController {

    private final ProductClient productClient;

    // ── Products ──────────────────────────────────────────────────────────────

    @GetMapping("/products")
    @Operation(summary = "Get all products",
               description = "PO create modal मध्ये product dropdown साठी. products-service कडून fetch करतो.")
    public ResponseEntity<List<ProductDto>> getAllProducts() {
        return ResponseEntity.ok(productClient.getAllProducts());
    }

    @GetMapping("/products/{productId}")
    @Operation(summary = "Get product by ID")
    public ResponseEntity<?> getProductById(@PathVariable Long productId) {
        ProductDto product = productClient.getProductById(productId);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(product);
    }

    @GetMapping("/products/{productId}/pricing")
    @Operation(summary = "Get product pricing",
               description = "GRN putaway साठी MRP, selling price, cost price.")
    public ResponseEntity<?> getProductPricing(@PathVariable Long productId) {
        PricingDto pricing = productClient.getPricingByProductId(productId);
        if (pricing == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pricing);
    }

    // ── Categories ────────────────────────────────────────────────────────────

    @GetMapping("/categories")
    @Operation(summary = "Get all categories",
               description = "Auto PO threshold config आणि GRN filtering साठी.")
    public ResponseEntity<List<CategoryDto>> getAllCategories() {
        return ResponseEntity.ok(productClient.getAllCategories());
    }

    // ── Subcategories ─────────────────────────────────────────────────────────

    @GetMapping("/subcategories")
    @Operation(summary = "Get all subcategories")
    public ResponseEntity<List<SubcategoryDto>> getAllSubcategories() {
        return ResponseEntity.ok(productClient.getAllSubcategories());
    }

    // ── Suppliers ─────────────────────────────────────────────────────────────

    @GetMapping("/suppliers")
    @Operation(summary = "Get all suppliers",
               description = "PO create modal मध्ये supplier dropdown साठी.")
    public ResponseEntity<List<SupplierDto>> getAllSuppliers() {
        return ResponseEntity.ok(productClient.getAllSuppliers());
    }

    @GetMapping("/suppliers/{supplierId}")
    @Operation(summary = "Get supplier by ID")
    public ResponseEntity<?> getSupplierById(@PathVariable Long supplierId) {
        SupplierDto supplier = productClient.getSupplierById(supplierId);
        if (supplier == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(supplier);
    }
}
