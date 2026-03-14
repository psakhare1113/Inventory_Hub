package com.pixelbloom.orders.requestEntity;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ReserveItemResponse {

    private String orderNumber;
    private List<InventoryReservedItemDto> items;

}
