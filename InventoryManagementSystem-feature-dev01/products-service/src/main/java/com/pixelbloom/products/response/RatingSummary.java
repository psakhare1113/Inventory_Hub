package com.pixelbloom.products.response;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RatingSummary {


    private Long productId;
    private Double averageRating;
    private Long totalReviews;
    private LocalDateTime lastUpdated;
}