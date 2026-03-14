package com.pixelbloom.orders.responseEntity;

import com.pixelbloom.orders.enums.OrderStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class OrderItemResponseOriginal {
    private Long productId;
    private Integer quantity;
    private String barcode;
    private BigDecimal unitPrice;
    private BigDecimal totalPrice;
    private OrderStatus orderStatus;
}