package com.pixelbloom.orders.restClients;

import com.pixelbloom.orders.config.FeignConfig;
import com.pixelbloom.orders.requestEntity.PaymentRequest;
import com.pixelbloom.orders.requestEntity.RefundPaymentRequest;
import com.pixelbloom.orders.responseEntity.PaymentResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "payment-gateway",url = "${api.gateway.url:http://localhost:9999}",
        configuration = FeignConfig.class)

public interface PaymentFeignClient {

    @PostMapping("/api/payments/pay")
    PaymentResponse pay(@RequestBody PaymentRequest request);

    @PostMapping("/api/payments/refund")
    public PaymentResponse refund(RefundPaymentRequest refundPaymentRequest);
    }
