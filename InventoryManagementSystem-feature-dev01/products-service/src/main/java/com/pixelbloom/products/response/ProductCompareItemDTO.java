package com.pixelbloom.products.response;

import com.pixelbloom.products.model.Pricing;
import com.pixelbloom.products.model.Product;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class ProductCompareItemDTO {
    private Long id;
    private String name;
    private BigDecimal mrp;
    private BigDecimal sellingPrice;
    private Double discount;
    private Double pricePerUnit;
    private Double averageRating;
    private Long totalReviews;
    private Boolean cheapest = false;
    private Boolean highestRated = false;
    private Boolean highestDiscount = false;



    public ProductCompareItemDTO(Long id, String name, BigDecimal mrp, BigDecimal sellingPrice,
                                 Double discount, Double pricePerUnit, Double averageRating, Long totalReviews) {
        this.id = id;
        this.name = name;
        this.mrp = mrp;
        this.sellingPrice = sellingPrice;
        this.discount = discount;
        this.pricePerUnit = pricePerUnit;
        this.averageRating = averageRating;
        this.totalReviews = totalReviews;
        this.cheapest = false;
        this.highestRated = false;
        this.highestDiscount = false;
    }
    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
    public static ProductCompareItemDTO toItem(
            Product product,
            Pricing pricing,
            RatingSummary rating) {

        if (pricing == null) {
            return new ProductCompareItemDTO(
                    product.getProductId(),
                    product.getProductBarcode(),
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    0.0,
                    0.0,
                    rating != null ? rating.getAverageRating() : 0,
                    rating != null ? rating.getTotalReviews() : 0
            );
        }

        double discount =
                pricing.getMrp().doubleValue() > 0
                        ? ((pricing.getMrp().doubleValue()
                        - pricing.getSellingPrice().doubleValue())
                        / pricing.getMrp().doubleValue()) * 100
                        : 0;

        double pricePerUnit =
                pricing.getUnitSize() != null && pricing.getUnitSize() > 0
                        ? pricing.getSellingPrice().doubleValue()
                        / pricing.getUnitSize()
                        : 0;

        return new ProductCompareItemDTO(
                product.getProductId(),
                product.getProductBarcode(),
                pricing.getMrp(),
                pricing.getSellingPrice(),
                round(discount),
                round(pricePerUnit),
                rating != null ? rating.getAverageRating() : 0,
                rating != null ? rating.getTotalReviews() : 0
        );
    }




}
