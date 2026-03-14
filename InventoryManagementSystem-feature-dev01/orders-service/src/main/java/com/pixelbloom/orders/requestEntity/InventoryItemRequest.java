package com.pixelbloom.orders.requestEntity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
public class InventoryItemRequest {
    private Long productId;
    private Long categoryId;
    private Long subcategoryId;
    private Integer quantity;
}