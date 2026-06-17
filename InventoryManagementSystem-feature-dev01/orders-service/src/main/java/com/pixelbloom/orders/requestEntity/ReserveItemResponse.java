package com.pixelbloom.orders.requestEntity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReserveItemResponse {

    private String orderNumber;
    private List<InventoryReservedItemDto> items;

}
