package com.pixelbloom.products.controller;

import com.pixelbloom.products.enums.ProductStatus;
import com.pixelbloom.products.model.Product;
import com.pixelbloom.products.model.ProductRefundException;
import com.pixelbloom.products.model.RefundPolicy;
import com.pixelbloom.products.repository.ProductRefundExceptionRepository;
import com.pixelbloom.products.repository.RefundPolicyRepository;
import com.pixelbloom.products.request.ProductCreateRequest;
import com.pixelbloom.products.request.ProductUpdateRequest;
import com.pixelbloom.products.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService service;
    private final RefundPolicyRepository refundPolicyRepository;
    private final ProductRefundExceptionRepository refundExceptionRepository;

    @PostMapping("/add")
    public ResponseEntity<Product> create(@RequestBody ProductCreateRequest request) {
        return ResponseEntity.ok(service.create(request));
    }

    @GetMapping
    public List<Product> getAllProducts() {
        return service.getAllProducts();
    }

    @GetMapping("/getByProductId/{productId}")
    public Product get(@PathVariable Long productId) {
        return service.getById(productId);
    }

    @GetMapping("/getBySubcategoryId")
    public List<Product> getBySubCategoryId(@RequestParam("subCategoryId") Long subCategoryId) {
        return service.getBySubCategoryId(subCategoryId);
    }

    @GetMapping("/getBySubCategoryIdandStatus")
    public List<Product> getBySubCategoryIdandStatus(
            @RequestParam(value = "subCategoryId", required = false) Long subCategoryId,
            @RequestParam("status") ProductStatus status) {
        return service.getBySubcategoryAndStatus(subCategoryId, status);
    }

    @GetMapping("/compareProduct")
    public List<Product> getProducts(
            @RequestParam Long subcategoryId,
            @RequestParam List<Long> productIds) {
        return service.getProducts(subcategoryId, productIds);
    }

    @PostMapping("/checkSellable")
    public ResponseEntity<?> checkSellable(
            @RequestParam Long productId,
            @RequestParam Long categoryId,
            @RequestParam Long subcategoryId,
            @RequestParam int requestedQuantity) {
        return ResponseEntity.ok(service.getAvailableProducts(productId, categoryId, subcategoryId, requestedQuantity));
    }

    // Fix: Change parameter name from 'id' to 'productId'
    @PutMapping("updateProduct/{productId}")
    public Product update(@PathVariable Long productId, @RequestBody ProductUpdateRequest request) {
        return service.update(productId, request);
    }

    // Fix: Change parameter name from 'id' to 'productId'
    @PatchMapping("/{productId}/disable")
    public void disable(@PathVariable Long productId) {
        service.disable(productId);
    }

    // Fix: Change parameter name from 'id' to 'productId'
    @PatchMapping("/{productId}/enable")
    public void enable(@PathVariable Long productId) {
        service.enable(productId);
    }

    // Complete delete - removes product from database
    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long productId) {
        service.deleteProduct(productId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/refund-eligibility")
    public ResponseEntity<Boolean> isProductRefundEligible(
            @RequestParam Long productId,
            @RequestParam Long categoryId,
            @RequestParam Long subcategoryId) {
        return ResponseEntity.ok(service.isProductRefundEligible(productId, categoryId, subcategoryId));
    }

    @PostMapping("/refund-policies")
    public ResponseEntity<RefundPolicy> createRefundPolicy(@RequestBody RefundPolicy policy) {
        return ResponseEntity.ok(refundPolicyRepository.save(policy));
    }

    @PostMapping("/product-refund-exceptions")
    public ResponseEntity<ProductRefundException> createProductRefundException(@RequestBody ProductRefundException exception) {
        return ResponseEntity.ok(refundExceptionRepository.save(exception));
    }

    // ── Recommendations ──────────────────────────────────────────────────────

    /**
     * Related Products: same subcategory, ACTIVE status, excludes current product.
     * GET /api/products/{productId}/related?subcategoryId=5&limit=8
     */
    @GetMapping("/{productId}/related")
    public ResponseEntity<List<Product>> getRelatedProducts(
            @PathVariable Long productId,
            @RequestParam Long subcategoryId,
            @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(service.getRelatedProducts(productId, subcategoryId, limit));
    }

    /**
     * Relevant Products: complementary products from subcategory map + product attribute tags.
     * GET /api/products/{productId}/relevant?categoryId=2&subcategoryId=5&limit=8
     */
    @GetMapping("/{productId}/relevant")
    public ResponseEntity<List<Product>> getRelevantProducts(
            @PathVariable Long productId,
            @RequestParam Long categoryId,
            @RequestParam Long subcategoryId,
            @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(service.getRelevantProducts(productId, categoryId, subcategoryId, limit));
    }

    // ── Complementary Map CRUD (Admin) ────────────────────────────────────────

    /**
     * GET /api/products/complementary-map          → all mappings
     * GET /api/products/complementary-map?subcategoryId=6 → mappings for subcategory 6
     */
    @GetMapping("/complementary-map")
    public ResponseEntity<?> getComplementaryMappings(
            @RequestParam(required = false) Long subcategoryId) {
        if (subcategoryId != null) {
            return ResponseEntity.ok(service.getComplementaryMappings(subcategoryId));
        }
        return ResponseEntity.ok(service.getAllComplementaryMappings());
    }

    /**
     * POST /api/products/complementary-map
     * Body: { "subcategoryId": 6, "complementarySubcategoryId": 7, "label": "Accessories" }
     */
    @PostMapping("/complementary-map")
    public ResponseEntity<?> addComplementaryMapping(
            @RequestBody com.pixelbloom.products.model.SubcategoryComplementaryMap request) {
        try {
            return ResponseEntity.ok(service.addComplementaryMapping(
                    request.getSubcategoryId(),
                    request.getComplementarySubcategoryId(),
                    request.getLabel()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * DELETE /api/products/complementary-map?subcategoryId=6&complementarySubcategoryId=7
     */
    @DeleteMapping("/complementary-map")
    public ResponseEntity<Void> removeComplementaryMapping(
            @RequestParam Long subcategoryId,
            @RequestParam Long complementarySubcategoryId) {
        service.removeComplementaryMapping(subcategoryId, complementarySubcategoryId);
        return ResponseEntity.noContent().build();
    }
}
