package com.pixelbloom.orders.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderEmailEvent {
    private String eventType; // ORDER_CONFIRMED, ORDER_DELIVERED, etc.
    private String orderNumber;
    private Long customerId;
    private String customerEmail;
    private String customerName;
    private LocalDateTime eventTime;
    private String message;
}