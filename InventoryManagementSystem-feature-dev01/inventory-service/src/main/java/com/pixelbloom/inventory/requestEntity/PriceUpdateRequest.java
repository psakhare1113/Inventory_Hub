package com.pixelbloom.inventory.requestEntity;

import lombok.Data;

import java.math.BigDecimal;
@Data
public class PriceUpdateRequest {
    private BigDecimal mrp;
    private BigDecimal showroomPrice;
    private BigDecimal sellingPrice;
    private Long updatedBy;

}
