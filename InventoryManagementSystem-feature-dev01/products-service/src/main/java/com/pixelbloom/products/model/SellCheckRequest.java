package com.pixelbloom.products.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SellCheckRequest {
    private List<SellItem> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SellItem {
        private Long productId;
        private Long categoryId;
        private Long subcategoryId;
        private int requestedQuantity;

    }
}
