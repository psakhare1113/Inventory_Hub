package com.pixelbloom.products.repository;

import com.pixelbloom.products.enums.ProductStatus;
import com.pixelbloom.products.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    // Fix: Change 'Id' to 'ProductId'
    boolean existsByProductIdAndStatus(Long productId, ProductStatus status);

    List<Product> findBySubcategoryIdAndStatus(Long subcategoryId, ProductStatus status);
    List<Product> findBySubcategoryId(Long subcategoryId);

    // Fix: Change 'productId' to 'ProductId' in method name
    List<Product> findBySubcategoryIdAndProductId(Long subcategoryId, Long productId);
    List<Product> findBySubcategoryIdAndProductIdIn(Long subcategoryId, List<Long> productIds);

    // Fix: Change 'Id' to 'ProductId'
    Optional<Product> findByProductIdAndCategoryIdAndSubcategoryId(Long productId, Long categoryId, Long subcategoryId);
}
