package com.pixelbloom.orders.model;

import com.pixelbloom.orders.enums.CustomerStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomerProfile {
    private Long id;
    private String name;
    private String email;
    private CustomerStatus status;
}