package com.pixelbloom.products.repository;

import com.pixelbloom.products.enums.ProductStatus;
import com.pixelbloom.products.model.Product;
import org.springframework.data.domain.Pageable;
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

    // ── Recommendations ──────────────────────────────────────────────────────
    // Related: same subcategory, exclude current product, only ACTIVE
    List<Product> findBySubcategoryIdAndStatusAndProductIdNot(Long subcategoryId, ProductStatus status, Long productId);
    List<Product> findBySubcategoryIdAndStatusAndProductIdNot(Long subcategoryId, ProductStatus status, Long productId, Pageable pageable);

    // Relevant: same category, different subcategory, only ACTIVE
    List<Product> findByCategoryIdAndSubcategoryIdNotAndStatusAndProductIdNot(
            Long categoryId, Long subcategoryId, ProductStatus status, Long productId);

    // For recommendation system
    List<Product> findByStatusOrderByProductIdDesc(ProductStatus status, Pageable pageable);
    List<Product> findBySubcategoryIdInAndStatusAndProductIdNotIn(List<Long> subcategoryIds, ProductStatus status, List<Long> excludeProductIds, Pageable pageable);
    List<Product> findByCategoryIdInAndStatusAndProductIdNotIn(List<Long> categoryIds, ProductStatus status, List<Long> excludeProductIds, Pageable pageable);
    List<Product> findByStatusAndProductIdNotIn(ProductStatus status, List<Long> excludeProductIds, Pageable pageable);
    List<Product> findByCategoryIdAndStatusAndProductIdNot(Long categoryId, ProductStatus status, Long productId, Pageable pageable);
    List<Product> findByStatusAndProductIdNot(ProductStatus status, Long productId, Pageable pageable);
}
