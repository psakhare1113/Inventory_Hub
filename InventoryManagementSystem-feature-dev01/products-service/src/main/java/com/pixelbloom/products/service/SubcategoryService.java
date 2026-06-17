package com.pixelbloom.products.service;

import com.pixelbloom.products.model.Subcategory;
import java.util.List;

public interface SubcategoryService {
    List<Subcategory> getAllSubcategories();
    List<Subcategory> getSubcategoriesByCategory(Long categoryId);
    /** Returns direct subcategories (level 2) — parentSubcategoryId IS NULL */
    List<Subcategory> getRootSubcategories();
    /** Returns sub-subcategories (level 3) under a given subcategory */
    List<Subcategory> getSubSubCategories(Long parentSubcategoryId);
    Subcategory getSubcategoryById(Long id);
    Subcategory createSubcategory(Subcategory subcategory);
    Subcategory updateSubcategory(Long id, Subcategory subcategory);
    void deleteSubcategory(Long id);
}
