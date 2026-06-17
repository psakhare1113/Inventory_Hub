package com.pixelbloom.orders.restClients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@FeignClient(name = "auth-service-email", url = "http://localhost:2000")
public interface AuthServiceClient {
    @GetMapping("/api/customer/id-by-email")
    Long getCustomerIdByEmail(@RequestParam String email);

    @GetMapping("/api/auth/customer/{customerId}")
    Map<String, Object> getCustomerById(@PathVariable Long customerId);
}
