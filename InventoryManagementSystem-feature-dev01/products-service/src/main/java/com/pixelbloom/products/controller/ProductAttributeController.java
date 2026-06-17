package com.pixelbloom.products.controller;

import com.pixelbloom.products.model.ProductAttribute;
import com.pixelbloom.products.service.ProductAttributeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/product-attributes")
@RequiredArgsConstructor
public class ProductAttributeController {

    private final ProductAttributeService service;

    // Get attributes for a product (frontend compatible)
    @GetMapping("/product/{productId}")
    public List<ProductAttribute> getProductAttributes(@PathVariable Long productId) {
        return service.getAttributesList(productId);
    }

    // Save / Update attributes
    @PostMapping
    public ResponseEntity<?> saveAttributes(@RequestBody ProductAttribute attribute) {
        try {
            service.saveAttribute(attribute);
            return ResponseEntity.ok().body(Map.of("success", true, "message", "Attribute saved successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save attribute: " + e.getMessage()));
        }
    }

    // Save / Update attributes (bulk)
    @PostMapping("/bulk/{productId}")
    public ResponseEntity<?> saveAttributes(
            @PathVariable Long productId,
            @RequestBody Map<String, String> attributes) {
        try {
            service.saveAttributes(productId, attributes);
            return ResponseEntity.ok().body(Map.of(
                "success", true, 
                "message", "Attributes saved successfully",
                "count", attributes.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save attributes: " + e.getMessage()));
        }
    }

    // Filter products
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
