package com.pixelbloom.orders.requestEntity;

import lombok.Builder;
import lombok.Data;

import java.util.List;
@Data
@Builder
public class OrderInspectionRequest {

    String orderNumber;
    String barcode;
}
