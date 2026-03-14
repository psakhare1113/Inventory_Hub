package com.pixelbloom.shipping.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "orders-service", url = "http://localhost:9095")
public interface OrdersCustomerClient {

    @GetMapping("/api/orders/customerDetails/{customerId}")
    CustomerDetailsResponse getCustomerDetails(@PathVariable Long customerId);
}

