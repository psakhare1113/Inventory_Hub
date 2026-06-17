package com.pixelbloom.products.controller;

import com.pixelbloom.products.model.Subcategory;
import com.pixelbloom.products.service.SubcategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/subcategories")
@RequiredArgsConstructor
public class SubcategoryController {
    private final SubcategoryService subcategoryService;

    /** All subcategories (level 2 + level 3) */
    @GetMapping
    public ResponseEntity<List<Subcategory>> getAllSubcategories() {
        return ResponseEntity.ok(subcategoryService.getAllSubcategories());
    }

    /** Level-2 subcategories only (parentSubcategoryId IS NULL) */
    @GetMapping("/root")
    public ResponseEntity<List<Subcategory>> getRootSubcategories() {
        return ResponseEntity.ok(subcategoryService.getRootSubcategories());
    }

    /** All subcategories (level 2 + 3) under a root category */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<Subcategory>> getSubcategoriesByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(subcategoryService.getSubcategoriesByCategory(categoryId));
    }

    /** Level-3 sub-subcategories under a given subcategory */
    @GetMapping("/{parentSubcategoryId}/children")
    public ResponseEntity<List<Subcategory>> getSubSubCategories(@PathVariable Long parentSubcategoryId) {
        return ResponseEntity.ok(subcategoryService.getSubSubCategories(parentSubcategoryId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Subcategory> getSubcategoryById(@PathVariable Long id) {
        return ResponseEntity.ok(subcategoryService.getSubcategoryById(id));
    }

    @PostMapping
    public ResponseEntity<Subcategory> createSubcategory(@RequestBody Subcategory subcategory) {
        return ResponseEntity.ok(subcategoryService.createSubcategory(subcategory));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Subcategory> updateSubcategory(@PathVariable Long id, @RequestBody Subcategory subcategory) {
        return ResponseEntity.ok(subcategoryService.updateSubcategory(id, subcategory));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSubcategory(@PathVariable Long id) {
        subcategoryService.deleteSubcategory(id);
        return ResponseEntity.ok().build();
    }
}
