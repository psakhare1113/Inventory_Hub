package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.model.ProductRatingSummary;
import com.pixelbloom.products.model.Review;
import com.pixelbloom.products.repository.ProductRatingSummaryRepository;
import com.pixelbloom.products.repository.ReviewRepository;
import com.pixelbloom.products.response.RatingSummary;
import com.pixelbloom.products.service.ReviewService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReviewServiceImpl implements ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRatingSummaryRepository summaryRepository;

    public ReviewServiceImpl(ReviewRepository reviewRepository, ProductRatingSummaryRepository summaryRepository) {
        this.reviewRepository = reviewRepository;
        this.summaryRepository = summaryRepository;
    }

    @Override
    public Map<Long, RatingSummary> getRatingSummary(List<Long> productIds) {

        List<Review> reviews =
                reviewRepository.findByProductIdIn(productIds);

        return reviews.stream()
                .collect(Collectors.groupingBy(
                        Review::getProductId,
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                list -> {
                                    double avg = list.stream()
                                            .mapToInt(Review::getRating)
                                            .average()
                                            .orElse(0);
                                    return new RatingSummary(
                                            list.stream().mapToLong(Review::getProductId).findFirst().orElse(0L), // productId - will be set by the map key
                                            avg,  // averageRating as Double
                                            (long) list.size(), // totalReviews as Long
                                            LocalDateTime.now() // lastUpdated
                                    );
                                }
                        )
                ));
    }

    @Override
    public Review getCustomerReview(Long productId, Long customerId) {
        return reviewRepository
                .findByProductIdAndCustomerId(productId, customerId)
                .orElse(null);
    }

    @Override
    public Review addReviewforProduct(Review review) {
        Review saveReview = reviewRepository.save(review);
        updateRatingSummary(review.getProductId());
        return saveReview;
    }

// this summary is saved & updated from table -product_rating_summary also there is api which is constructing summary response for given product Id's
    //so 2 ways we are getting product -review rating summary// summary here is just recorded in table and not fetch anywhere
    private void updateRatingSummary(Long productId) {
        Object result = reviewRepository.getRatingStats(productId);

        Double avg = 0.0;
        Long count = 0L;

        if (result instanceof Object[]) {
            Object[] outerArray = (Object[]) result;

            if (outerArray.length > 0 && outerArray[0] instanceof Object[]) {
                Object[] stats = (Object[]) outerArray[0];

                System.out.println("Inner array length: " + stats.length);
                if (stats.length >= 2) {
                    System.out.println("stats[0] type: " + (stats[0] != null ? stats[0].getClass().getName() : "null"));
                    System.out.println("stats[0] value: " + (stats[0] != null ? stats[0].toString().replaceAll("[\r\n]", "") : "null"));
                    System.out.println("stats[1] type: " + (stats[1] != null ? stats[1].getClass().getName() : "null"));
                    System.out.println("stats[1] value: " + (stats[1] != null ? stats[1].toString().replaceAll("[\r\n]", "") : "null"));

                    if (stats[0] != null) {
                        try {
                            avg = Double.valueOf(stats[0].toString());
                        } catch (NumberFormatException e) {
                            avg = 0.0;
                        }
                    }
                    if (stats[1] != null) {
                        try {
                            count = Long.valueOf(stats[1].toString());
                        } catch (NumberFormatException e) {
                            count = 0L;
                        }
                    }

                }
            }
        }

        ProductRatingSummary summary =
                summaryRepository.findById(productId)
                        .orElse(new ProductRatingSummary());

        summary.setProductId(productId);
        summary.setAverageRating(Math.round(avg * 100.0) / 100.0);
        summary.setTotalReviews(count);
        summary.setLastUpdated(LocalDateTime.now());

        summaryRepository.save(summary);
    }



    @Override
    @Transactional
    public Review updateReview(Long reviewId, Integer rating, String comment) {

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Review not found"));

        review.setRating(rating);
        review.setComment(comment);
        review.setUpdatedAt(LocalDateTime.now());

        Review saved = reviewRepository.save(review);

        updateRatingSummary(saved.getProductId());

        return saved;
    }


}