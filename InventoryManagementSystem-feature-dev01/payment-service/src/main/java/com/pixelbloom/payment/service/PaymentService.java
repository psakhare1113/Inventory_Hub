package com.pixelbloom.payment.service;

import com.pixelbloom.payment.requestDto.PaymentRequest;
import com.pixelbloom.payment.requestDto.RefundRequest;
import com.pixelbloom.payment.responseDto.PaymentResponse;
import com.pixelbloom.payment.responseDto.RefundResponse;

public interface PaymentService {
    PaymentResponse processPayment(PaymentRequest request);

    RefundResponse processRefundPayment(RefundRequest request);
}
