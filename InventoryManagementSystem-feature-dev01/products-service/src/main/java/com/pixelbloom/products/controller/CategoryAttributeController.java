package com.pixelbloom.products.controller;

import com.pixelbloom.products.model.CategoryAttribute;
import com.pixelbloom.products.service.CategoryAttributeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryAttributeController {
    private final CategoryAttributeService categoryAttributeService;

    @GetMapping("/{categoryId}/attributes")
    public ResponseEntity<List<CategoryAttribute>> getCategoryAttributes(@PathVariable Long categoryId) {
        return ResponseEntity.ok(categoryAttributeService.getCategoryAttributes(categoryId));
    }

    @PostMapping("/{categoryId}/attributes")
    public ResponseEntity<CategoryAttribute> createCategoryAttribute(
            @PathVariable Long categoryId, 
            @RequestBody CategoryAttribute categoryAttribute) {
        categoryAttribute.setCategoryId(categoryId);
        return ResponseEntity.ok(categoryAttributeService.createCategoryAttribute(categoryAttribute));
    }

    @PostMapping("/{categoryId}/attributes/bulk")
    public ResponseEntity<List<CategoryAttribute>> createBulkCategoryAttributes(
            @PathVariable Long categoryId, 
            @RequestBody List<String> attributeNames) {
        return ResponseEntity.ok(categoryAttributeService.createBulkCategoryAttributes(categoryId, attributeNames));
    }

    @DeleteMapping("/{categoryId}/attributes")
    public ResponseEntity<Void> deleteCategoryAttributes(@PathVariable Long categoryId) {
        categoryAttributeService.deleteCategoryAttributes(categoryId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/attributes/{attributeId}")
    public ResponseEntity<Void> deleteCategoryAttribute(@PathVariable Long attributeId) {
        categoryAttributeService.deleteCategoryAttribute(attributeId);
        return ResponseEntity.ok().build();
    }
}