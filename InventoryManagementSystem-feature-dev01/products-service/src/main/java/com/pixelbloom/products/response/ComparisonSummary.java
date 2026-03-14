package com.pixelbloom.products.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ComparisonSummary {

    private Double minSellingPrice;
    private Double maxSellingPrice;

    private Double maxRating;
    private Double minRating;

    private Double maxDiscountPercent;
}