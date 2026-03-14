package com.pixelbloom.orders.requestEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@Builder
public class InventoryReleaseRequest {
    private String orderNumber;
    private List<String> barcodes;

}
