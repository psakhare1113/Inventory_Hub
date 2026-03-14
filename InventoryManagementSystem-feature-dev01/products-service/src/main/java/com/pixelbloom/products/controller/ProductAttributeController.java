package com.pixelbloom.products.controller;

import com.pixelbloom.products.model.ProductAttribute;
import com.pixelbloom.products.service.ProductAttributeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductAttributeController {

    private final ProductAttributeService service;

    // 1️ Get attributes for a product
    @GetMapping("/{productId}")
    public Map<String, String> getProductAttributes(@PathVariable Long productId) {
        return service.getAttributes(productId);
    }

    // 2️ Save / Update attributes
    @PostMapping("/{productId}/attributes")
    public void saveAttributes(
            @PathVariable Long productId,
            @RequestBody Map<String, String> attributes) {

        service.saveAttributes(productId, attributes);
    }

    // 3️ Filter products
    @GetMapping("/search")
    public List<Long> filterProducts(
            @RequestParam Map<String, String> filters) {
        return service.filterProducts(filters);
    }
    @PutMapping("/admin/{productId}/updateAttribute")
    public void updateProductAttributes(@PathVariable Long productId, @RequestBody Map<String, String> attributes) {
         service.saveAttributes(productId, attributes);
    }
}
