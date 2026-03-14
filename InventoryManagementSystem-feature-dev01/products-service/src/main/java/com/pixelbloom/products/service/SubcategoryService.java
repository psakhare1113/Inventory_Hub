package com.pixelbloom.products.service;

import com.pixelbloom.products.model.Subcategory;
import java.util.List;

public interface SubcategoryService {
    List<Subcategory> getAllSubcategories();
    Subcategory getSubcategoryById(Long id);
    Subcategory createSubcategory(Subcategory subcategory);
    Subcategory updateSubcategory(Long id, Subcategory subcategory);
    void deleteSubcategory(Long id);
}
