package com.pixelbloom.products.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProductListingResponse {
    private Long productId;
    private String name;
    private String status;
    private int availableQuanity;
   // e.g., "IN_STOCK"


}
