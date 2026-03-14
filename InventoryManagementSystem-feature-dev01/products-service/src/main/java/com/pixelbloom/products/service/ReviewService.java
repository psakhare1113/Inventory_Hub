package com.pixelbloom.products.service;

import com.pixelbloom.products.model.Review;
import com.pixelbloom.products.response.RatingSummary;

import java.util.List;
import java.util.Map;

public interface ReviewService {
    Map<Long, RatingSummary> getRatingSummary(List<Long> productIds);

    Review getCustomerReview(Long productId, Long customerId);

    Review addReviewforProduct(Review review);

    Review updateReview(Long reviewId, Integer rating, String comment);
}

