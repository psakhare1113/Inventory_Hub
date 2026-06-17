package com.pixelbloom.payment.service;

import com.pixelbloom.payment.requestDto.PaymentRequest;
import com.pixelbloom.payment.requestDto.RefundRequest;
import com.pixelbloom.payment.responseDto.PaymentResponse;
import com.pixelbloom.payment.responseDto.RefundResponse;

public interface PaymentService {

    // Existing method
    PaymentResponse processPayment(PaymentRequest request);

    RefundResponse processRefundPayment(RefundRequest request);

    // Razorpay methods
    PaymentResponse createRazorpayOrder(PaymentRequest request);

    PaymentResponse verifyRazorpayPayment(PaymentRequest request);

    PaymentResponse getOrderStatus(String orderId);

    // COD: delivery boy marks cash as collected at doorstep
    PaymentResponse markCodCollected(String orderNumber);
}
