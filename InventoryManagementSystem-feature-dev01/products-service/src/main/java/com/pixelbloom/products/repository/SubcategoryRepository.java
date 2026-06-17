package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.Subcategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubcategoryRepository extends JpaRepository<Subcategory, Long> {

    /** All subcategories under a root category */
    List<Subcategory> findByCategoryId(Long categoryId);

    /** Level-2 subcategories only (parentSubcategoryId is null) */
    List<Subcategory> findByParentSubcategoryIdIsNull();

    /** Level-3 sub-subcategories under a given subcategory */
    List<Subcategory> findByParentSubcategoryId(Long parentSubcategoryId);
}
