package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.enums.ProductStatus;
import com.pixelbloom.products.model.ProductRefundException;
import com.pixelbloom.products.exception.ResourceNotFoundException;
import com.pixelbloom.products.model.*;
import com.pixelbloom.products.repository.ProductAttributeRepository;
import com.pixelbloom.products.repository.ProductRefundExceptionRepository;
import com.pixelbloom.products.repository.ProductRepository;
import com.pixelbloom.products.repository.RefundPolicyRepository;
import com.pixelbloom.products.request.ProductCreateRequest;
import com.pixelbloom.products.request.ProductUpdateRequest;
import com.pixelbloom.products.response.ProductRefundEligibilityResponse;
import com.pixelbloom.products.client.InventoryClient;
import com.pixelbloom.products.repository.SubcategoryComplementaryMapRepository;
import com.pixelbloom.products.model.SubcategoryComplementaryMap;
import com.pixelbloom.products.service.ProductService;
import com.pixelbloom.products.response.ProductListingResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;


@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final InventoryClient inventoryClient;
    private final ProductRefundExceptionRepository refundExceptionRepository;
    private final RefundPolicyRepository refundPolicyRepository;
    private final ProductAttributeRepository attributeRepository;
    private final SubcategoryComplementaryMapRepository complementaryMapRepository;

    public ProductServiceImpl(ProductRepository productRepository,
                              InventoryClient inventoryClient,
                              ProductRefundExceptionRepository refundExceptionRepository,
                              RefundPolicyRepository refundPolicyRepository,
                              ProductAttributeRepository attributeRepository,
                              SubcategoryComplementaryMapRepository complementaryMapRepository) {
        this.productRepository = productRepository;
        this.inventoryClient = inventoryClient;
        this.refundExceptionRepository = refundExceptionRepository;
        this.refundPolicyRepository = refundPolicyRepository;
        this.attributeRepository = attributeRepository;
        this.complementaryMapRepository = complementaryMapRepository;
    }
   /* @Override
    public Product create(Product product) {
        if (product == null) {
            throw new IllegalArgumentException("Product cannot be null");
        }
        product.setStatus(ProductStatus.ACTIVE);
        return productRepository.save(product);
    }


    @Override
    public Product update(Long id, Product updated) {
        Product existingProduct = getById(id);
        existingProduct.setProductBarcode(updated.getProductBarcode());
        existingProduct.setCategoryId(updated.getCategoryId());
        existingProduct.setSubcategoryId(updated.getSubcategoryId());
        return productRepository.save(existingProduct);
    }


    }*/

    @Override
    public Product getById(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    @Override
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Override
    public List<Product> getBySubCategoryId(Long subCategoryId) {
        return productRepository.findBySubcategoryId(subCategoryId);
    }

    @Override
    public List<Product> getBySubcategoryAndStatus(Long subcategoryId, ProductStatus status) {
        return productRepository.findBySubcategoryIdAndStatus(subcategoryId, status);
    }
    @Override
    public List<Product> getProducts(Long subcategoryId, List<Long> productIds) {
        return productRepository.findBySubcategoryIdAndProductIdIn(subcategoryId, productIds);
    }

    @Override
    public ProductRefundEligibilityResponse checkRefundEligibility(Long productId, Long categoryId, Long subcategoryId) {
        Product product = productRepository.findByProductIdAndCategoryIdAndSubcategoryId(productId, categoryId, subcategoryId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!product.isEligibleForReturn()) {
            return ProductRefundEligibilityResponse.builder()
                    .refundEligible(false)
                    .reason("Product is not eligible for return")
                    .build();
        }

        return ProductRefundEligibilityResponse.builder()
                .refundEligible(true)
                .reason("Product is eligible for refund")
                .build();
    }

    public List<ProductListingResponse> getAvailableProducts(Long productId, Long categoryId, Long subcategoryId, int requestedQuantity) {
        Product product = productRepository.findByProductIdAndCategoryIdAndSubcategoryId(productId, categoryId, subcategoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        SellCheckRequest request = new SellCheckRequest();
        request.setItems(List.of(new SellCheckRequest.SellItem(productId, categoryId, subcategoryId, requestedQuantity)));

        SellCheckResponse response = inventoryClient.checkSellable(request);

        if (response == null || response.getResults().isEmpty()) {
            return List.of();
        }

        return response.getResults().stream()
                .filter(SellCheckResponse.SellItemResult::isSellable)
                .map(r -> new ProductListingResponse(
                        product.getProductId(),
                        product.getProductBarcode(),
                        "IN_STOCK",
                        r.getAvailableQuantity()))
                .toList();
    }



    @Override
    public Boolean isProductRefundEligible(Long productId, Long categoryId, Long subcategoryId) {
        // ── Step 1: Check product's own is_eligible_for_return flag (highest priority) ──
        // This directly maps to is_eligible_for_return column in imsproductsdb.products
        Optional<Product> productOpt = productRepository.findByProductIdAndCategoryIdAndSubcategoryId(
                productId, categoryId, subcategoryId);

        if (productOpt.isPresent()) {
            Product product = productOpt.get();
            // If product explicitly marked as NOT eligible → block return
            if (!product.isEligibleForReturn()) {
                return false;
            }
        } else {
            // Try finding by productId only (category/subcategory mismatch)
            Optional<Product> byIdOnly = productRepository.findById(productId);
            if (byIdOnly.isPresent() && !byIdOnly.get().isEligibleForReturn()) {
                return false;
            }
        }

        // ── Step 2: Check product-specific refund exception ──
        Optional<ProductRefundException> exception =
                refundExceptionRepository.findByProductIdAndActiveTrue(productId);
        if (exception.isPresent()) {
            return exception.get().getRefundable();
        }

        // ── Step 3: Check subcategory-level policy ──
        Optional<RefundPolicy> subcategoryPolicy =
                refundPolicyRepository.findByCategoryIdAndSubcategoryIdAndActiveTrue(categoryId, subcategoryId);
        if (subcategoryPolicy.isPresent()) {
            return subcategoryPolicy.get().getRefundable();
        }

        // ── Step 4: Check category-level policy ──
        Optional<RefundPolicy> categoryPolicy =
                refundPolicyRepository.findByCategoryIdAndSubcategoryIdNullAndActiveTrue(categoryId);
        if (categoryPolicy.isPresent()) {
            return categoryPolicy.get().getRefundable();
        }

        // ── Step 5: Default — eligible ──
        return true;
    }
// Add these methods to your ProductServiceImpl

    @Override
    public Product create(ProductCreateRequest request) {
        Product product = new Product();
        product.setProductBarcode(request.getProductBarcode());
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setCategoryId(request.getCategoryId());
        product.setSubcategoryId(request.getSubcategoryId());
        // Set default status if not provided
        product.setStatus(request.getStatus() != null ? request.getStatus() : ProductStatus.ACTIVE);
        product.setProductUrl(request.getProductUrl());
        product.setEligibleForReturn(request.isEligibleForReturn());

        return productRepository.save(product);
    }

    @Override
    public Product update(Long productId, ProductUpdateRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        product.setProductBarcode(request.getProductBarcode());
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setCategoryId(request.getCategoryId());
        product.setSubcategoryId(request.getSubcategoryId());
        product.setStatus(request.getStatus());
        product.setProductUrl(request.getProductUrl());
        product.setEligibleForReturn(request.isEligibleForReturn());

        return productRepository.save(product);
    }

    @Override
    public void disable(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        product.setStatus(ProductStatus.INACTIVE);
        productRepository.save(product);
    }

    @Override
    public void enable(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        product.setStatus(ProductStatus.ACTIVE);
        productRepository.save(product);
    }

    @Override
    @Transactional
    public void deleteProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        
        // Delete all related product attributes first
        attributeRepository.deleteByProductId(productId);
        
        // Delete the product completely from database
        productRepository.delete(product);
    }

    // ── Recommendations ──────────────────────────────────────────────────────

    @Override
    public List<Product> getRelatedProducts(Long productId, Long subcategoryId, int limit) {
        return productRepository
                .findBySubcategoryIdAndStatusAndProductIdNot(subcategoryId, ProductStatus.ACTIVE, productId)
                .stream()
                .limit(limit)
                .toList();
    }

    /**
     * Relevant Products — merges two sources:
     *
     * Source A (subcategory_complementary_map):
     *   Admin defines: subcategoryId=6 → complementarySubcategoryId=7 (Watch)
     *   → fetch all ACTIVE products from those complementary subcategories
     *
     * Source B (product_attributes):
     *   Product has attribute: name="complementarySubcategories", value="7,8"
     *   → parse comma-separated subcategory IDs, fetch ACTIVE products from them
     *
     * Both sources are merged, deduplicated, current product excluded, limited.
     */
    @Override
    public List<Product> getRelevantProducts(Long productId, Long categoryId, Long subcategoryId, int limit) {
        java.util.Set<Long> complementarySubcatIds = new java.util.LinkedHashSet<>();

        // ── Source A: subcategory_complementary_map ──────────────────────────
        complementaryMapRepository.findBySubcategoryId(subcategoryId)
                .forEach(m -> complementarySubcatIds.add(m.getComplementarySubcategoryId()));

        // ── Source B: product_attributes (complementarySubcategories tag) ────
        attributeRepository.findComplementarySubcategoriesAttr(productId)
                .ifPresent(attr -> {
                    String[] parts = attr.getValue().split(",");
                    for (String part : parts) {
                        try {
                            complementarySubcatIds.add(Long.parseLong(part.trim()));
                        } catch (NumberFormatException ignored) {}
                    }
                });

        // If no complementary mappings defined at all, fall back to same-category different-subcategory
        if (complementarySubcatIds.isEmpty()) {
            return productRepository
                    .findByCategoryIdAndSubcategoryIdNotAndStatusAndProductIdNot(
                            categoryId, subcategoryId, ProductStatus.ACTIVE, productId)
                    .stream()
                    .limit(limit)
                    .toList();
        }

        // Fetch products from all complementary subcategories, merge & deduplicate
        java.util.Map<Long, Product> seen = new java.util.LinkedHashMap<>();
        for (Long compSubcatId : complementarySubcatIds) {
            productRepository
                    .findBySubcategoryIdAndStatusAndProductIdNot(compSubcatId, ProductStatus.ACTIVE, productId)
                    .forEach(p -> seen.putIfAbsent(p.getProductId(), p));
            if (seen.size() >= limit) break;
        }

        return seen.values().stream().limit(limit).toList();
    }

    // ── Complementary Map CRUD ────────────────────────────────────────────────

    @Override
    public SubcategoryComplementaryMap addComplementaryMapping(Long subcategoryId, Long complementarySubcategoryId, String label) {
        if (complementaryMapRepository.existsBySubcategoryIdAndComplementarySubcategoryId(
                subcategoryId, complementarySubcategoryId)) {
            throw new IllegalArgumentException(
                "Mapping already exists: " + subcategoryId + " → " + complementarySubcategoryId);
        }
        SubcategoryComplementaryMap map = new SubcategoryComplementaryMap();
        map.setSubcategoryId(subcategoryId);
        map.setComplementarySubcategoryId(complementarySubcategoryId);
        map.setLabel(label);
        return complementaryMapRepository.save(map);
    }

    @Override
    @Transactional
    public void removeComplementaryMapping(Long subcategoryId, Long complementarySubcategoryId) {
        complementaryMapRepository.deleteBySubcategoryIdAndComplementarySubcategoryId(
                subcategoryId, complementarySubcategoryId);
    }

    @Override
    public List<SubcategoryComplementaryMap> getComplementaryMappings(Long subcategoryId) {
        return complementaryMapRepository.findBySubcategoryId(subcategoryId);
    }

    @Override
    public List<SubcategoryComplementaryMap> getAllComplementaryMappings() {
        return complementaryMapRepository.findAll();
    }

}
