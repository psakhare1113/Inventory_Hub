package com.pixelbloom.orders.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomerProfileResponse {
    private Long customerId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String addressLine1;
    private String city;
    private String state;
    private String pincode;
    private String profilePicUrl;
    private String status;
    private int totalOrders;
    private int totalReviews;
}