package com.pixelbloom.orders.restClients;

import com.pixelbloom.orders.responseEntity.CustomerDetailsResponse;
import lombok.Builder;
import lombok.Data;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "auth-service-customer", url = "${auth-server.url:http://localhost:2000}")
public interface CustomerClient {
    @GetMapping("/api/auth/customer/{customerId}")
    CustomerDetailsResponse getCustomerDetails(@PathVariable Long customerId);
}


