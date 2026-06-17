package com.pixelbloom.orders.restClients;

import com.pixelbloom.orders.config.FeignConfig;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@FeignClient(name = "products-gateway", url = "${api.gateway.url:http://localhost:9999}", configuration = FeignConfig.class)
public interface ProductsClient {

    @GetMapping("/api/products/reviews/customer/{customerId}")
    List<Object> getCustomerReviews(@PathVariable Long customerId);

    @GetMapping("/api/products/reviews/product/{productId}/customer/{customerId}")
    Object getProductReviewByCustomer(@PathVariable Long productId, @PathVariable Long customerId);

    @PostMapping("/api/products/reviews")
    Object submitReview(@RequestBody Map<String, Object> reviewRequest);

    /**
     * Check if a product is eligible for return based on:
     * - Product's is_eligible_for_return flag in imsproductsdb.products
     * - Category/subcategory refund policy
     * Returns true if eligible, false if not
     */
    @GetMapping("/api/products/refund-eligibility")
    Boolean isProductRefundEligible(
            @RequestParam("productId") Long productId,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam("subcategoryId") Long subcategoryId);

    /**
     * Fetch product details by ID — used to get actual product name for pick list lines
     */
    @GetMapping("/api/products/getByProductId/{productId}")
    Map<String, Object> getProductById(@PathVariable Long productId);
}
