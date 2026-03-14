package com.pixelbloom.orders.restClients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "auth-service-email", url = "http://localhost:2000")
public interface AuthServiceClient {
    @GetMapping("/api/customer/id-by-email")
    Long getCustomerIdByEmail(@RequestParam String email);
}
