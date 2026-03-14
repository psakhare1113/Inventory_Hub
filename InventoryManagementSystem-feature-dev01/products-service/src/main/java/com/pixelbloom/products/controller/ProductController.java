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
}
