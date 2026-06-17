package com.pixelbloom.products.service;

import com.pixelbloom.products.model.CategoryAttribute;
import java.util.List;

public interface CategoryAttributeService {
    List<CategoryAttribute> getCategoryAttributes(Long categoryId);
    CategoryAttribute createCategoryAttribute(CategoryAttribute categoryAttribute);
    void deleteCategoryAttribute(Long id);
    void deleteCategoryAttributes(Long categoryId);
    List<CategoryAttribute> createBulkCategoryAttributes(Long categoryId, List<String> attributeNames);
}