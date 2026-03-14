package com.pixelbloom.products.response;

import com.pixelbloom.products.model.ProductComparisonItem;
import lombok.Data;

import java.util.List;
@Data
public class ProductComparisonResponse {
    private Long subcategoryId;
    private List<ProductComparisonItem> comparison;
}
