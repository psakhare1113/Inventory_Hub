package com.pixelbloom.payment.controller;

import com.pixelbloom.payment.requestDto.PaymentRequest;
import com.pixelbloom.payment.requestDto.RefundRequest;
import com.pixelbloom.payment.responseDto.PaymentResponse;
import com.pixelbloom.payment.responseDto.RefundResponse;
import com.pixelbloom.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/pay")
    public PaymentResponse pay(@RequestBody PaymentRequest request) {
        return paymentService.processPayment(request);
    }

    @PostMapping("/refund")
    public RefundResponse refund(@RequestBody RefundRequest request) {
        return paymentService.processRefundPayment(request);
    }


}