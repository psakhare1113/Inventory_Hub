package com.pixelbloom.products.service;

import com.pixelbloom.products.model.Category;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface CategoryService {
    List<Category> getAllCategories();
    Category getCategoryById(Long id);
    Category createCategory(Category category);
    Category updateCategory(Long id, Category category);
    void deleteCategory(Long id);
    Map<Long, BigDecimal> getGstRateMap();
}
