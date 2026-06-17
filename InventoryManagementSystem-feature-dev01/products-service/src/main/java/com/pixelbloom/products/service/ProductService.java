package com.pixelbloom.products.service;

import com.pixelbloom.products.enums.ProductStatus;
import com.pixelbloom.products.model.Product;
import com.pixelbloom.products.request.ProductCreateRequest;
import com.pixelbloom.products.request.ProductUpdateRequest;
import com.pixelbloom.products.response.ProductListingResponse;
import com.pixelbloom.products.response.ProductRefundEligibilityResponse;

import java.util.List;

public interface ProductService {
    Product create(ProductCreateRequest request);
    Product update(Long productId, ProductUpdateRequest request);
    Product getById(Long productId);
    List<Product> getAllProducts();
    List<Product> getBySubCategoryId(Long subCategoryId);
    List<Product> getBySubcategoryAndStatus(Long subcategoryId, ProductStatus status);
    List<Product> getProducts(Long subcategoryId, List<Long> productIds);
    void disable(Long productId);
    void enable(Long productId);
    void deleteProduct(Long productId);
    ProductRefundEligibilityResponse checkRefundEligibility(Long productId, Long categoryId, Long subcategoryId);
    Boolean isProductRefundEligible(Long productId, Long categoryId, Long subcategoryId);
    List<ProductListingResponse> getAvailableProducts(Long productId, Long categoryId, Long subcategoryId, int requestedQuantity);

    // ── Recommendations ──────────────────────────────────────────────────────
    /** Related: same subcategory, ACTIVE, exclude current product, max `limit` results */
    List<Product> getRelatedProducts(Long productId, Long subcategoryId, int limit);

    /**
     * Relevant: complementary products from two sources merged:
     *   A) subcategory_complementary_map table (admin-defined)
     *   B) product_attributes where name='complementarySubcategories' (tag-based)
     * Both sources are unioned, deduplicated, and limited.
     */
    List<Product> getRelevantProducts(Long productId, Long categoryId, Long subcategoryId, int limit);

    // ── Complementary Map CRUD (for Admin UI) ────────────────────────────────
    com.pixelbloom.products.model.SubcategoryComplementaryMap addComplementaryMapping(Long subcategoryId, Long complementarySubcategoryId, String label);
    void removeComplementaryMapping(Long subcategoryId, Long complementarySubcategoryId);
    List<com.pixelbloom.products.model.SubcategoryComplementaryMap> getComplementaryMappings(Long subcategoryId);
    List<com.pixelbloom.products.model.SubcategoryComplementaryMap> getAllComplementaryMappings();
}
