package com.pixelbloom.products.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CompareResponse {

    private Long subcategoryId;

    private ComparisonSummary summary;

    private List<ProductCompareItemDTO> comparison;
}