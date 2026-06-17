package com.pixelbloom.payment.controller;

import com.pixelbloom.payment.entity.GatewayPayment;
import com.pixelbloom.payment.entity.PaymentTransaction;
import com.pixelbloom.payment.entity.RefundTransaction;
import com.pixelbloom.payment.repository.GatewayPaymentRepository;
import com.pixelbloom.payment.repository.PaymentRefundRepository;
import com.pixelbloom.payment.repository.PaymentTransactionRepository;
import com.pixelbloom.payment.requestDto.PaymentRequest;
import com.pixelbloom.payment.requestDto.RefundRequest;
import com.pixelbloom.payment.responseDto.PaymentResponse;
import com.pixelbloom.payment.responseDto.RefundResponse;
import com.pixelbloom.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final GatewayPaymentRepository gatewayPaymentRepository;
    private final PaymentRefundRepository paymentRefundRepository;

    // ─── Existing endpoints ───────────────────────────────────────────────────

    @PostMapping("/pay")
    public PaymentResponse pay(@RequestBody PaymentRequest request) {
        return paymentService.processPayment(request);
    }

    @PostMapping("/refund")
    public RefundResponse refund(@RequestBody RefundRequest request) {
        return paymentService.processRefundPayment(request);
    }

    // ─── Razorpay endpoints ───────────────────────────────────────────────────

    /**
     * Step 1: Create a Razorpay order.
     * Frontend calls this first to get an orderId, then opens the Razorpay checkout.
     */
    @PostMapping("/razorpay/create-order")
    public ResponseEntity<PaymentResponse> createRazorpayOrder(@RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.createRazorpayOrder(request);
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
    }

    /**
     * Step 2: Verify the payment after Razorpay checkout completes.
     * Frontend sends razorpayOrderId, razorpayPaymentId, razorpaySignature.
     */
    @PostMapping("/razorpay/verify")
    public ResponseEntity<PaymentResponse> verifyRazorpayPayment(@RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.verifyRazorpayPayment(request);
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
    }

    /**
     * Get Razorpay order status by orderId.
     */
    @GetMapping("/razorpay/order/{orderId}")
    public ResponseEntity<PaymentResponse> getOrderStatus(@PathVariable String orderId) {
        PaymentResponse response = paymentService.getOrderStatus(orderId);
        return ResponseEntity.ok(response);
    }

    /**
     * Link actual orderNumber to payment transaction after order is created.
     * Called by frontend after order creation succeeds — updates payment_transactions
     * so refund can find the record by orderNumber.
     * PATCH /api/payments/link-order?razorpayOrderId=order_xyz&orderNumber=uuid
     */
    @PatchMapping("/link-order")
    public ResponseEntity<?> linkOrderNumber(
            @RequestParam String razorpayOrderId,
            @RequestParam String orderNumber) {
        try {
            // Update payment_transactions: set order_number = actual UUID
            paymentTransactionRepository.findByOrderNumber(razorpayOrderId).ifPresent(txn -> {
                txn.setOrderNumber(orderNumber);
                paymentTransactionRepository.save(txn);
            });
            // Also update gateway_payments for consistency
            GatewayPayment gp = gatewayPaymentRepository.findByOrderId(razorpayOrderId);
            if (gp != null) {
                gp.setOrderNumber(orderNumber);
                gatewayPaymentRepository.save(gp);
            }
            return ResponseEntity.ok(java.util.Map.of(
                "razorpayOrderId", razorpayOrderId,
                "orderNumber", orderNumber,
                "message", "Payment linked to order successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    /**
     * COD: Delivery boy marks cash as collected at customer's doorstep.
     * Called by delivery boy app after handing over the package and collecting cash.
     * PATCH /api/payments/cod/collected
     * Body: { "orderNumber": "uuid-..." }
     */
    @PatchMapping("/cod/collected")
    public ResponseEntity<PaymentResponse> markCodCollected(@RequestBody java.util.Map<String, String> body) {
        String orderNumber = body.get("orderNumber");
        if (orderNumber == null || orderNumber.isBlank()) {
            PaymentResponse err = new PaymentResponse();
            err.setSuccess(false);
            err.setMessage("orderNumber is required");
            return ResponseEntity.badRequest().body(err);
        }
        PaymentResponse response = paymentService.markCodCollected(orderNumber);
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
    }

    // ─── Admin GET endpoints ──────────────────────────────────────────────────

    /**
     * GET all payment transactions (admin).
     * Gateway rewrites /api/auth/admin/payments/transactions → /api/payments/transactions
     */
    @GetMapping("/transactions")
    public ResponseEntity<List<PaymentTransaction>> getAllTransactions() {
        return ResponseEntity.ok(paymentTransactionRepository.findAll());
    }

    /**
     * GET all gateway (Razorpay) payments (admin).
     * Gateway rewrites /api/auth/admin/payments/gateway → /api/payments/gateway
     */
    @GetMapping("/gateway")
    public ResponseEntity<List<GatewayPayment>> getAllGatewayPayments() {
        return ResponseEntity.ok(gatewayPaymentRepository.findAll());
    }

    /**
     * GET all refund transactions (admin).
     * Gateway rewrites /api/auth/admin/payments/refunds → /api/payments/refunds
     */
    @GetMapping("/refunds")
    public ResponseEntity<List<RefundTransaction>> getAllRefunds() {
        return ResponseEntity.ok(paymentRefundRepository.findAll());
    }
}
