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

    public ProductServiceImpl(ProductRepository productRepository,
                              InventoryClient inventoryClient,
                              ProductRefundExceptionRepository refundExceptionRepository,
                              RefundPolicyRepository refundPolicyRepository,
                              ProductAttributeRepository attributeRepository) {
        this.productRepository = productRepository;
        this.inventoryClient = inventoryClient;
        this.refundExceptionRepository = refundExceptionRepository;
        this.refundPolicyRepository = refundPolicyRepository;
        this.attributeRepository = attributeRepository;
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
        // 1. Check product-specific exception first (highest priority)
        Optional<ProductRefundException> exception =
                refundExceptionRepository.findByProductIdAndActiveTrue(productId);
        if (exception.isPresent()) {
            return exception.get().getRefundable();
        }

        // 2. Check subcategory-level policy
        Optional<RefundPolicy> subcategoryPolicy =
                refundPolicyRepository.findByCategoryIdAndSubcategoryIdAndActiveTrue(categoryId, subcategoryId);
        if (subcategoryPolicy.isPresent()) {
            return subcategoryPolicy.get().getRefundable();
        }

        // 3. Check category-level policy
        Optional<RefundPolicy> categoryPolicy =
                refundPolicyRepository.findByCategoryIdAndSubcategoryIdNullAndActiveTrue(categoryId);
        if (categoryPolicy.isPresent()) {
            return categoryPolicy.get().getRefundable();
        }

        // 4. Default: refundable
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
        product.setStatus(request.getStatus());
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



}
