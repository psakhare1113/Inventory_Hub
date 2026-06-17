package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.SubcategoryComplementaryMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubcategoryComplementaryMapRepository
        extends JpaRepository<SubcategoryComplementaryMap, Long> {

    /** All complementary subcategory IDs for a given source subcategory */
    List<SubcategoryComplementaryMap> findBySubcategoryId(Long subcategoryId);

    /** Check if a mapping already exists */
    boolean existsBySubcategoryIdAndComplementarySubcategoryId(
            Long subcategoryId, Long complementarySubcategoryId);

    /** Delete a specific mapping */
    void deleteBySubcategoryIdAndComplementarySubcategoryId(
            Long subcategoryId, Long complementarySubcategoryId);
}
