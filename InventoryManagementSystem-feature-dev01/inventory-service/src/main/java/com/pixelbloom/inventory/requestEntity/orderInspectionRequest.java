package com.pixelbloom.inventory.requestEntity;


import com.pixelbloom.inventory.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class orderInspectionRequest {
    String orderNumber;
    String barcode;
    private OrderStatus orderStatus;
    String returnReference;
    private String returnReason;
    private Boolean damageDeclared;
    private String damageReason;
    private List<String> images;
}
