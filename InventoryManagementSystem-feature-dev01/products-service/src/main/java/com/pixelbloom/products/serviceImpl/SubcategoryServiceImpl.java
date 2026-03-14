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
        return subcategoryRepository.save(existing);
    }

    @Override
    public void deleteSubcategory(Long id) {
        subcategoryRepository.deleteById(id);
    }
}
