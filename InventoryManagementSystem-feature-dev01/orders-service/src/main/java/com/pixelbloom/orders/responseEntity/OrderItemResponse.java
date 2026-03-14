package com.pixelbloom.orders.responseEntity;

import com.pixelbloom.orders.enums.OrderStatus;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class OrderItemResponse {
    private Long productId;
    private String barcode;
    private int quantity;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private OrderStatus orderStatus;
    private LocalDateTime deliveredAt;

    // New fields for review functionality
    private boolean canReview;        // Can customer write review?
    private boolean hasReviewed;      // Has customer already reviewed?
    private String reviewId;          // Existing review ID if any
    private String writeReviewUrl;    // URL to write review
    private String viewReviewUrl;     // URL to view existing review
}