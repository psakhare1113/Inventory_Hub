package com.pixelbloom.products.controller;

import com.pixelbloom.products.model.Review;
import com.pixelbloom.products.request.UpdateReviewRequest;
import com.pixelbloom.products.response.RatingSummary;
import com.pixelbloom.products.service.ReviewService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/summary")
    public Map<Long, RatingSummary> getRatingSummary(
            @RequestParam List<Long> productIds) {

        return reviewService.getRatingSummary(productIds);
    }

    @PostMapping("/addReview")
    public Review addReview(@RequestBody Review review) {
        return reviewService.addReviewforProduct(review);
    }

    @GetMapping("/customer")
    public Review getCustomerReview(
            @RequestParam Long productId,
            @RequestParam Long customerId) {

        return reviewService.getCustomerReview(productId, customerId);
    }

    @PutMapping("/updateReview/{reviewId}")
    public Review update(@PathVariable Long reviewId,@RequestBody UpdateReviewRequest request) {
        return reviewService.updateReview(reviewId,request.getRating(),request.getComment());
    }

    // Get all reviews for a product
    @GetMapping("/{productId}/reviews")
    public List<Review> getProductReviews(@PathVariable Long productId) {
        return reviewService.getProductReviews(productId);
    }
}
