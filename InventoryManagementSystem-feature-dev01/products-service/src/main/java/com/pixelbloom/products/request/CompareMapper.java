package com.pixelbloom.products.request;

import com.pixelbloom.products.model.Pricing;
import com.pixelbloom.products.model.Product;
import com.pixelbloom.products.response.CompareResponse;
import com.pixelbloom.products.response.ComparisonSummary;
import com.pixelbloom.products.response.ProductCompareItemDTO;
import com.pixelbloom.products.response.RatingSummary;

import java.util.List;
import java.util.Map;

import static com.pixelbloom.products.response.ProductCompareItemDTO.toItem;

public class CompareMapper {
    public static CompareResponse map(
            Long subcategoryId,
            List<Product> products,
            Map<Long, Pricing> pricingMap,
            Map<Long, RatingSummary> ratingMap
    ) {

        List<ProductCompareItemDTO> items = products.stream()
                .map(p -> toItem(
                        p,
                        pricingMap.get(p.getProductId()),
                        ratingMap.get(p.getProductId())
                ))
                .toList();

        markComparisons(items);

        return new CompareResponse(
                subcategoryId,
                buildSummary(items),
                items
        );


}

    private static void markComparisons(List<ProductCompareItemDTO> items) {

        double minPrice = items.stream()
                .mapToDouble(i -> i.getSellingPrice().doubleValue())
                .min()
                .orElse(0);

        double maxRating = items.stream()
                .mapToDouble(ProductCompareItemDTO::getAverageRating)
                .max()
                .orElse(0);

        double maxDiscount = items.stream()
                .mapToDouble(ProductCompareItemDTO::getDiscount)
                .max()
                .orElse(0);

        items.forEach(i -> {
            if (i.getSellingPrice().doubleValue() == minPrice) {
                i.setCheapest(true);
            }
            if (i.getAverageRating() == maxRating) {
                i.setHighestRated(true);
            }
            if (i.getDiscount() == maxDiscount) {
                i.setHighestDiscount(true);
            }
        });
    }

    private static ComparisonSummary buildSummary(List<ProductCompareItemDTO> items) {
        return new ComparisonSummary(
                items.stream()
                        .mapToDouble(i -> i.getSellingPrice().doubleValue())
                        .min().orElse(0),

                items.stream()
                        .mapToDouble(i -> i.getSellingPrice().doubleValue())
                        .max().orElse(0),

                items.stream()
                        .mapToDouble(ProductCompareItemDTO::getAverageRating)
                        .max().orElse(0),

                items.stream()
                        .mapToDouble(ProductCompareItemDTO::getAverageRating)
                        .min().orElse(0),

                items.stream()
                        .mapToDouble(ProductCompareItemDTO::getDiscount)
                        .max().orElse(0)
        );
    }
    }

