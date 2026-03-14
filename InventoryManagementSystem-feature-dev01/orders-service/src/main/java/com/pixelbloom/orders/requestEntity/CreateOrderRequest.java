package com.pixelbloom.orders.requestEntity;

import com.pixelbloom.orders.model.CreateOrderItemRequest;
import lombok.Data;

import java.util.List;
@Data
public class CreateOrderRequest {

    private Long customerId;
    private String paymentMode;
    private List<CreateOrderItemRequest> items;
    }
