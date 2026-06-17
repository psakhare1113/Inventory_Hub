package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.CategoryAttribute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CategoryAttributeRepository extends JpaRepository<CategoryAttribute, Long> {
    List<CategoryAttribute> findByCategoryIdOrderByDisplayOrder(Long categoryId);
    void deleteByCategoryId(Long categoryId);
}