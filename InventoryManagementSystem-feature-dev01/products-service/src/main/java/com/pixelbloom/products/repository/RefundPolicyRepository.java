package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.RefundPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefundPolicyRepository extends JpaRepository<RefundPolicy, Long> {
    Optional<RefundPolicy> findByCategoryIdAndSubcategoryIdAndActiveTrue(Long categoryId, Long subcategoryId);
    Optional<RefundPolicy> findByCategoryIdAndSubcategoryIdNullAndActiveTrue(Long categoryId);
}
