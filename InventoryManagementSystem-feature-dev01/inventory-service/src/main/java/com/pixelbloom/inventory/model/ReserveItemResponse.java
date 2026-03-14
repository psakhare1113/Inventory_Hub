package com.pixelbloom.inventory.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ReserveItemResponse {

    private String orderNumber;
    private List<InventoryReservedItemDto> items;

}
