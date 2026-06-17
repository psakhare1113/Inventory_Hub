package com.pixelbloom.payment.requestDto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {

    // Existing fields
    private String orderNumber;
    private BigDecimal amount;
    private String currency;
    private String paymentMethod;

    // Razorpay fields
    private Double razorpayAmount;       // used for createOrder (Double for Razorpay SDK)
    private String receipt;              // optional receipt label
    private String customerName;
    private String customerEmail;

    // Returned by Razorpay after user pays — used for verify & process
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;
}
