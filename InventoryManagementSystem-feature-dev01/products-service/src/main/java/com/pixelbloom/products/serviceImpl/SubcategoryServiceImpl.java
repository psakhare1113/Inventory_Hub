package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.model.Subcategory;
import com.pixelbloom.products.repository.SubcategoryRepository;
import com.pixelbloom.products.service.SubcategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubcategoryServiceImpl implements SubcategoryService {
    private final SubcategoryRepository subcategoryRepository;

    @Override
    public List<Subcategory> getAllSubcategories() {
        return subcategoryRepository.findAll();
    }

    @Override
    public List<Subcategory> getSubcategoriesByCategory(Long categoryId) {
        return subcategoryRepository.findByCategoryId(categoryId);
    }

    /** Returns only level-2 subcategories (parentSubcategoryId IS NULL) */
    @Override
    public List<Subcategory> getRootSubcategories() {
        return subcategoryRepository.findByParentSubcategoryIdIsNull();
    }

    /** Returns level-3 sub-subcategories under a given subcategory */
    @Override
    public List<Subcategory> getSubSubCategories(Long parentSubcategoryId) {
        return subcategoryRepository.findByParentSubcategoryId(parentSubcategoryId);
    }

    @Override
    public Subcategory getSubcategoryById(Long id) {
        return subcategoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Subcategory not found"));
    }

    @Override
    public Subcategory createSubcategory(Subcategory subcategory) {
        return subcategoryRepository.save(subcategory);
    }

    @Override
    public Subcategory updateSubcategory(Long id, Subcategory subcategory) {
        Subcategory existing = getSubcategoryById(id);
        existing.setName(subcategory.getName());
        existing.setCategoryId(subcategory.getCategoryId());
        existing.setImageUrl(subcategory.getImageUrl());
        existing.setParentSubcategoryId(subcategory.getParentSubcategoryId());
        return subcategoryRepository.save(existing);
    }

    @Override
    public void deleteSubcategory(Long id) {
        subcategoryRepository.deleteById(id);
    }
}
