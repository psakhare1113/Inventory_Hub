package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.request.CompareMapper;
import com.pixelbloom.products.response.CompareResponse;
import com.pixelbloom.products.service.CompareService;
import com.pixelbloom.products.service.PricingService;
import com.pixelbloom.products.service.ProductService;
import com.pixelbloom.products.service.ReviewService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CompareServiceImpl implements CompareService {

    private final ProductService productService;
    private final PricingService pricingService;
    private final ReviewService reviewService;

    public CompareServiceImpl(ProductService productService,
                              PricingService pricingService,
                              ReviewService reviewService) {
        this.productService = productService;
        this.pricingService = pricingService;
        this.reviewService = reviewService;
    }

    @Override
    public CompareResponse compare(
            Long subcategoryId,
            List<Long> productIds,
            Long customerId) {

        var products = productService.getProducts(subcategoryId, productIds);
        var pricing = pricingService.getPricing(productIds);
        var ratings = reviewService.getRatingSummary(productIds);

        return CompareMapper.map(
                subcategoryId,
                products,
                pricing,
                ratings
        );
    }
}
