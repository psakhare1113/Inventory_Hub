package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.model.CategoryAttribute;
import com.pixelbloom.products.repository.CategoryAttributeRepository;
import com.pixelbloom.products.service.CategoryAttributeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class CategoryAttributeServiceImpl implements CategoryAttributeService {
    private final CategoryAttributeRepository categoryAttributeRepository;

    @Override
    public List<CategoryAttribute> getCategoryAttributes(Long categoryId) {
        return categoryAttributeRepository.findByCategoryIdOrderByDisplayOrder(categoryId);
    }

    @Override
    public CategoryAttribute createCategoryAttribute(CategoryAttribute categoryAttribute) {
        return categoryAttributeRepository.save(categoryAttribute);
    }

    @Override
    public void deleteCategoryAttribute(Long id) {
        categoryAttributeRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void deleteCategoryAttributes(Long categoryId) {
        categoryAttributeRepository.deleteByCategoryId(categoryId);
    }

    @Override
    @Transactional
    public List<CategoryAttribute> createBulkCategoryAttributes(Long categoryId, List<String> attributeNames) {
        // Delete existing attributes for this category
        deleteCategoryAttributes(categoryId);
        
        List<CategoryAttribute> attributes = new ArrayList<>();
        for (int i = 0; i < attributeNames.size(); i++) {
            CategoryAttribute attribute = new CategoryAttribute();
            attribute.setCategoryId(categoryId);
            attribute.setAttributeName(attributeNames.get(i));
            attribute.setDisplayOrder(i);
            attribute.setIsRequired(false);
            attributes.add(categoryAttributeRepository.save(attribute));
        }
        return attributes;
    }
}