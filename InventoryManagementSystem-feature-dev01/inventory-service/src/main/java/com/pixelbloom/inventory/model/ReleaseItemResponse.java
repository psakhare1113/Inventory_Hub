package com.pixelbloom.inventory.model;

import lombok.Data;

import java.util.List;

@Data
public class ReleaseItemResponse {
    private String orderNumber;
    private List<ReserveItem> items;


}
