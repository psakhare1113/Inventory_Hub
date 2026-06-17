package com.pixelbloom.warehouse.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * HTTP client to fetch Product, Category, Subcategory, Supplier, Pricing
 * details from products-service.
 *
 * All product-related APIs needed by Warehouse are here:
 *   - getAllProducts()       → product list when creating PO
 *   - getProductById()      → category/subcategory for GRN putaway
 *   - getAllCategories()     → for threshold config
 *   - getAllSubcategories()  → for filtering
 *   - getAllSuppliers()      → supplier list when creating PO
 *   - getSupplierById()      → to enrich PO response
 *   - getPricingByProductId() → MRP/pricing for GRN putaway
 */
@Component
@Slf4j
public class ProductClient {

    private final RestTemplate restTemplate;
    private final String productsServiceUrl;

    public ProductClient(RestTemplate restTemplate,
                         @Value("${products.service.url:http://localhost:9094}") String productsServiceUrl) {
        this.restTemplate = restTemplate;
        this.productsServiceUrl = productsServiceUrl;
    }

    // ── Products ──────────────────────────────────────────────────────────────

    /**
     * All ACTIVE products — for product dropdown in PO create modal.
     * GET /api/products
     */
    public List<ProductDto> getAllProducts() {
        try {
            String url = productsServiceUrl + "/api/products";
            List<ProductDto> list = restTemplate.exchange(
                url, HttpMethod.GET, null,
                new ParameterizedTypeReference<List<ProductDto>>() {}
            ).getBody();
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Could not fetch all products from products-service: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Single product by ID — categoryId, subcategoryId for GRN putaway.
     * GET /api/products/getByProductId/{productId}
     */
    public ProductDto getProductById(Long productId) {
        try {
            String url = productsServiceUrl + "/api/products/getByProductId/" + productId;
            ProductDto dto = restTemplate.getForObject(url, ProductDto.class);
            log.info("Fetched product details for ID {}: category={}, subcategory={}",
                    productId,
                    dto != null ? dto.getCategoryId() : "null",
                    dto != null ? dto.getSubcategoryId() : "null");
            return dto;
        } catch (Exception e) {
            log.warn("Could not fetch product details for ID {} from products-service: {}", productId, e.getMessage());
            return null;
        }
    }

    // ── Categories ────────────────────────────────────────────────────────────

    /**
     * All categories — for threshold config and GRN filtering.
     * GET /api/categories
     */
    public List<CategoryDto> getAllCategories() {
        try {
            String url = productsServiceUrl + "/api/categories";
            List<CategoryDto> list = restTemplate.exchange(
                url, HttpMethod.GET, null,
                new ParameterizedTypeReference<List<CategoryDto>>() {}
            ).getBody();
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Could not fetch categories from products-service: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // ── Subcategories ─────────────────────────────────────────────────────────

    /**
     * All subcategories.
     * GET /api/subcategories
     */
    public List<SubcategoryDto> getAllSubcategories() {
        try {
            String url = productsServiceUrl + "/api/subcategories";
            List<SubcategoryDto> list = restTemplate.exchange(
                url, HttpMethod.GET, null,
                new ParameterizedTypeReference<List<SubcategoryDto>>() {}
            ).getBody();
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Could not fetch subcategories from products-service: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // ── Suppliers ─────────────────────────────────────────────────────────────

    /**
     * All suppliers — for supplier dropdown in PO create modal.
     * GET /api/auth/admin/suppliers
     */
    public List<SupplierDto> getAllSuppliers() {
        try {
            String url = productsServiceUrl + "/api/auth/admin/suppliers";
            List<SupplierDto> list = restTemplate.exchange(
                url, HttpMethod.GET, null,
                new ParameterizedTypeReference<List<SupplierDto>>() {}
            ).getBody();
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            log.warn("Could not fetch suppliers from products-service: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Single supplier by ID — to enrich PO response.
     * GET /api/auth/admin/suppliers/{supplierId}
     */
    public SupplierDto getSupplierById(Long supplierId) {
        try {
            String url = productsServiceUrl + "/api/auth/admin/suppliers/" + supplierId;
            SupplierDto dto = restTemplate.getForObject(url, SupplierDto.class);
            if (dto != null) {
                if (dto.getName()    != null) dto.setName(dto.getName().trim());
                if (dto.getPhone()   != null) dto.setPhone(dto.getPhone().trim());
                if (dto.getEmail()   != null) dto.setEmail(dto.getEmail().trim());
                if (dto.getCompany() != null) dto.setCompany(dto.getCompany().trim());
            }
            return dto;
        } catch (Exception e) {
            log.warn("Could not fetch supplier {} from products-service: {}", supplierId, e.getMessage());
            return null;
        }
    }

    // ── Pricing ───────────────────────────────────────────────────────────────

    /**
     * Pricing by product ID — MRP and selling price for GRN putaway.
     * GET /api/products/priceByProductId/{productId}
     */
    public PricingDto getPricingByProductId(Long productId) {
        try {
            String url = productsServiceUrl + "/api/products/priceByProductId/" + productId;
            PricingDto dto = restTemplate.getForObject(url, PricingDto.class);
            log.info("Fetched pricing for product ID {}: mrp={}, sellingPrice={}",
                    productId,
                    dto != null ? dto.getMrp() : "null",
                    dto != null ? dto.getSellingPrice() : "null");
            return dto;
        } catch (Exception e) {
            log.warn("Could not fetch pricing for product ID {} from products-service: {}", productId, e.getMessage());
            return null;
        }
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductDto {
        private Long productId;
        private String name;
        private String productBarcode;
        private Long categoryId;
        private Long subcategoryId;
        private String status;
        private String description;
        private String productUrl;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryDto {
        private Long id;
        private String name;
        private String imageUrl;
        private java.math.BigDecimal gstRate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubcategoryDto {
        private Long id;
        private String name;
        private Long categoryId;
        private String imageUrl;
        private Long parentSubcategoryId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SupplierDto {
        private Long supplierId;
        private String name;
        private String email;
        private String phone;
        private String company;
        private String contactPerson;
        private String address;
        private String city;
        private String state;
        private String pincode;
        private String gstNumber;
        private String status;
        private String category;
        private Double rating;
        private Integer totalOrders;
        private Double totalPurchaseValue;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime lastOrderDate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PricingDto {
        private Long productId;
        private BigDecimal mrp;
        private BigDecimal sellingPrice;
        private BigDecimal costPrice;
        private BigDecimal discount;
    }
}
