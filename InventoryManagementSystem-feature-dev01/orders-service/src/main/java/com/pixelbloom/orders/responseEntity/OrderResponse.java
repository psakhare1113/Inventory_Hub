package com.pixelbloom.orders.responseEntity;

import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.model.Order;
import com.pixelbloom.orders.model.OrderItem;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class OrderResponse {

    private String orderNumber;
    private BigDecimal totalAmount;
    private String orderStatus;
    private LocalDateTime createdAt;
    private LocalDateTime deliveredAt;
    private String warning;
    private List<OrderItemResponse> items;

    // New field for overall review summary
    private ReviewSummary reviewSummary;

    @Data
    @Builder
    public static class ReviewSummary {
        private int totalItems;
        private int reviewedItems;
        private int pendingReviews;
        private boolean allItemsReviewed;
    }
}
