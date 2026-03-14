package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.ProductRefundException;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductRefundExceptionRepository extends JpaRepository<ProductRefundException, Long> {
    Optional<ProductRefundException> findByProductIdAndActiveTrue(Long productId);
}