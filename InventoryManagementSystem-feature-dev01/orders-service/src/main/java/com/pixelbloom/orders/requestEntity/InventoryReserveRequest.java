package com.pixelbloom.orders.requestEntity;

import lombok.Builder;
import lombok.Data;

import java.util.List;
@Data
@Builder
public class InventoryReserveRequest {

    private String orderNumber;
    private List<InventoryItemRequest> items;


}
