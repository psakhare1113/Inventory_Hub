package com.pixelbloom.products.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "product_rating_summary")
@Data
public class ProductRatingSummary {

    @Id
    private Long productId;
    private Double averageRating;
    private Long totalReviews;
    private LocalDateTime lastUpdated;
}