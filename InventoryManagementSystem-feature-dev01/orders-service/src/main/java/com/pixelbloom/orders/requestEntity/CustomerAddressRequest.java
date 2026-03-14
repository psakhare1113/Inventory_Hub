package com.pixelbloom.orders.requestEntity;

import lombok.Data;

@Data
public class CustomerAddressRequest {

    private String addressLine1;
    private String addressLine2;
    private String city;
    private String state;
    private String pincode;
    private String country;
    private boolean isDefault;
}