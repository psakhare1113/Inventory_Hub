package com.pixelbloom.products.model;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SellCheckResponse {
    private List<SellItemResult> results;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SellItemResult {
        private Long productId;
        private Long categoryId;
        private Long subcategoryId;
        private int availableQuantity;
        private boolean sellable;
        private String reason; // optional
    }
}