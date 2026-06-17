package com.pixelbloom.payment.serviceImpl;

import com.pixelbloom.payment.constants.PaymentStatus;
import com.pixelbloom.payment.constants.RefundStatus;
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
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentTransactionRepository paymentRepository;
    private final PaymentRefundRepository paymentRefundRepository;
    private final GatewayPaymentRepository gatewayPaymentRepository;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Value("${payment.test.mode:false}")
    private boolean testMode;

    // ─────────────────────────────────────────────
    // Existing mock payment flow (kept as-is)
    // ─────────────────────────────────────────────

    @Override
    @Transactional
    public PaymentResponse processPayment(PaymentRequest request) {
        PaymentTransaction txn = new PaymentTransaction();
        txn.setOrderNumber(request.getOrderNumber());
        txn.setAmount(request.getAmount());
        txn.setCurrency(request.getCurrency());
        txn.setPaymentMethod(request.getPaymentMethod());
        txn.setCreatedAt(LocalDateTime.now());

        // ── COD: record as PENDING — cash collected at delivery door ──────────
        if ("CASH_ON_DELIVERY".equalsIgnoreCase(request.getPaymentMethod())) {
            txn.setStatus(PaymentStatus.PENDING);
            txn.setPaymentTxnId("COD-" + UUID.randomUUID().toString());
            paymentRepository.save(txn);

            PaymentResponse response = new PaymentResponse();
            response.setSuccess(true);
            response.setTransactionId(txn.getPaymentTxnId());
            response.setCreatedAt(LocalDateTime.now());
            return response;
        }

        // ── Online / other payment modes ──────────────────────────────────────
        boolean success = request.getAmount().compareTo(BigDecimal.ZERO) > 0;

        // ToDo: replace with real payment gateway call
        boolean paymentGatewaySuccess = true;

        if (paymentGatewaySuccess) {
            txn.setStatus(PaymentStatus.SUCCESS);
            txn.setPaymentTxnId(UUID.randomUUID().toString());
        } else {
            txn.setStatus(PaymentStatus.FAILED);
        }

        paymentRepository.save(txn);

        PaymentResponse response = new PaymentResponse();
        response.setSuccess(success && paymentGatewaySuccess);
        response.setTransactionId(txn.getPaymentTxnId());
        response.setCreatedAt(LocalDateTime.now());
        if (!success || !paymentGatewaySuccess) {
            response.setFailureReason(!success ? "Invalid payment amount" : "Payment gateway declined");
        }
        return response;
    }

    @Override
    @Transactional
    public RefundResponse processRefundPayment(RefundRequest request) {
        PaymentTransaction payment = paymentRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new RuntimeException("Payment not found for order: " + request.getOrderNumber()));

        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            return new RefundResponse(false, request.getOrderNumber(), "Already refunded");
        }

        // Determine actual refund amount:
        // If frontend sends a partial refundAmount, use that; otherwise full payment amount
        BigDecimal actualRefundAmount = (request.getRefundAmount() != null
                && request.getRefundAmount().compareTo(BigDecimal.ZERO) > 0)
                ? request.getRefundAmount()
                : payment.getAmount();

        // Partial refund cannot exceed original payment
        if (actualRefundAmount.compareTo(payment.getAmount()) > 0) {
            return new RefundResponse(false, request.getOrderNumber(),
                    "Refund amount ₹" + actualRefundAmount + " exceeds original payment ₹" + payment.getAmount());
        }

        String currency = request.getCurrency() != null ? request.getCurrency() : "INR";

        RefundTransaction refund = paymentRefundRepository.save(
                RefundTransaction.builder()
                        .orderNumber(request.getOrderNumber())
                        .refundTxnId(payment.getPaymentTxnId())
                        .refundAmount(actualRefundAmount)
                        .refundReason(request.getRefundReason())
                        .refundStatus(RefundStatus.INITIATED)
                        .refundedAt(LocalDateTime.now())
                        .build()
        );

        // ToDo: replace with real Razorpay refund API call:
        // razorpay.payments.refund(payment.getPaymentTxnId(),
        //     new JSONObject().put("amount", actualRefundAmount.multiply(BigDecimal.valueOf(100)).intValue())
        //                     .put("speed", "normal"));
        String gatewayTxnId = UUID.randomUUID().toString();
        boolean paymentGatewaySuccess = true;

        if (!paymentGatewaySuccess) {
            refund.setRefundStatus(RefundStatus.FAILED);
            refund.setRefundedAt(LocalDateTime.now());
            paymentRefundRepository.save(refund);
            return new RefundResponse(request.getOrderNumber(), actualRefundAmount,
                    currency, refund.getRefundStatus(), gatewayTxnId,
                    request.getPaymentSource(), refund.getRefundedAt(), "Refund failed, please try again!");
        }

        refund.setRefundStatus(RefundStatus.SUCCESS);
        refund.setRefundedAt(LocalDateTime.now());
        refund.setRefundTxnId(gatewayTxnId);
        paymentRefundRepository.save(refund);

        // Mark as REFUNDED only on full refund; partial stays as SUCCESS
        if (actualRefundAmount.compareTo(payment.getAmount()) == 0) {
            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
        }

        return new RefundResponse(request.getOrderNumber(), actualRefundAmount,
                currency, refund.getRefundStatus(), gatewayTxnId,
                request.getPaymentSource(), refund.getRefundedAt(),
                "Refund of ₹" + actualRefundAmount + " initiated successfully via " +
                (request.getPaymentSource() != null ? request.getPaymentSource() : "original payment method"));
    }

    // ─────────────────────────────────────────────
    // Razorpay integration
    // ─────────────────────────────────────────────

    @Override
    public PaymentResponse createRazorpayOrder(PaymentRequest request) {
        try {
            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            Double amount = request.getRazorpayAmount() != null
                    ? request.getRazorpayAmount()
                    : (request.getAmount() != null ? request.getAmount().doubleValue() * 100 : 0.0);

            String currency = request.getCurrency() != null ? request.getCurrency() : "INR";

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amount.intValue()); // already in paise from frontend
            orderRequest.put("currency", currency);
            orderRequest.put("receipt", request.getReceipt() != null
                    ? request.getReceipt()
                    : "receipt_" + System.currentTimeMillis());

            Order order = razorpay.orders.create(orderRequest);
            String orderId = order.get("id");

            // Save to DB in a separate try so DB errors don't mask Razorpay errors
            try {
                GatewayPayment gatewayPayment = new GatewayPayment();
                gatewayPayment.setTransactionId(orderId);
                gatewayPayment.setOrderId(orderId);
                gatewayPayment.setAmount(amount);
                gatewayPayment.setCurrency(currency);
                gatewayPayment.setStatus("created");
                gatewayPayment.setCustomerName(request.getCustomerName());
                gatewayPayment.setCustomerEmail(request.getCustomerEmail());
                gatewayPaymentRepository.save(gatewayPayment);
            } catch (Exception dbEx) {
                System.err.println("⚠️ DB save failed but Razorpay order created: " + dbEx.getMessage());
                // Still return success — order was created in Razorpay
            }

            PaymentResponse response = new PaymentResponse();
            response.setSuccess(true);
            response.setMessage("Razorpay order created successfully");
            response.setOrderId(orderId);
            response.setAmount(amount);
            response.setCurrency(currency);
            response.setStatus("created");
            return response;

        } catch (RazorpayException e) {
            System.err.println("❌ Razorpay error: " + e.getMessage());
            e.printStackTrace();
            PaymentResponse response = new PaymentResponse();
            response.setSuccess(false);
            response.setMessage("Failed to create Razorpay order: " + e.getMessage());
            return response;
        } catch (Exception e) {
            System.err.println("❌ Unexpected error in createRazorpayOrder: " + e.getMessage());
            e.printStackTrace();
            PaymentResponse response = new PaymentResponse();
            response.setSuccess(false);
            response.setMessage("Unexpected error: " + e.getMessage());
            return response;
        }
    }

    @Override
    public PaymentResponse verifyRazorpayPayment(PaymentRequest request) {
        String orderId = request.getRazorpayOrderId();
        String paymentId = request.getRazorpayPaymentId();
        String signature = request.getRazorpaySignature();

        if (orderId == null || paymentId == null || signature == null) {
            PaymentResponse response = new PaymentResponse();
            response.setSuccess(false);
            response.setMessage("Missing required fields: razorpayOrderId, razorpayPaymentId, razorpaySignature");
            return response;
        }

        try {
            GatewayPayment payment = gatewayPaymentRepository.findByOrderId(orderId);

            if (testMode) {
                // Skip HMAC check in test mode
                if (payment != null) {
                    payment.setPaymentId(paymentId);
                    payment.setSignature(signature);
                    payment.setStatus("completed");
                    gatewayPaymentRepository.save(payment);
                }

                // Also record in payment_transactions for admin reporting
                savePaymentTransaction(request, orderId, paymentId, "RAZORPAY", "SUCCESS");

                PaymentResponse response = new PaymentResponse();
                response.setSuccess(true);
                response.setMessage("Payment verified successfully (TEST MODE)");
                response.setOrderId(orderId);
                response.setPaymentId(paymentId);
                response.setStatus("completed");
                return response;
            }

            // Production: verify HMAC-SHA256 signature
            String payload = orderId + "|" + paymentId;
            String expectedSignature = generateHmacSHA256(payload, razorpayKeySecret);

            if (signature.equals(expectedSignature)) {
                if (payment != null) {
                    payment.setPaymentId(paymentId);
                    payment.setSignature(signature);
                    payment.setStatus("completed");
                    gatewayPaymentRepository.save(payment);
                }

                // Also record in payment_transactions for admin reporting
                savePaymentTransaction(request, orderId, paymentId, "RAZORPAY", "SUCCESS");

                PaymentResponse response = new PaymentResponse();
                response.setSuccess(true);
                response.setMessage("Payment verified successfully");
                response.setOrderId(orderId);
                response.setPaymentId(paymentId);
                response.setStatus("completed");
                return response;
            } else {
                if (payment != null) {
                    payment.setStatus("verification_failed");
                    gatewayPaymentRepository.save(payment);
                }
                PaymentResponse response = new PaymentResponse();
                response.setSuccess(false);
                response.setMessage("Invalid signature. Payment verification failed.");
                response.setOrderId(orderId);
                response.setStatus("verification_failed");
                return response;
            }

        } catch (Exception e) {
            PaymentResponse response = new PaymentResponse();
            response.setSuccess(false);
            response.setMessage("Verification error: " + e.getMessage());
            return response;
        }
    }

    @Override
    public PaymentResponse getOrderStatus(String orderId) {
        GatewayPayment payment = gatewayPaymentRepository.findByOrderId(orderId);
        PaymentResponse response = new PaymentResponse();
        if (payment != null) {
            response.setSuccess(true);
            response.setOrderId(payment.getOrderId());
            response.setPaymentId(payment.getPaymentId());
            response.setAmount(payment.getAmount());
            response.setCurrency(payment.getCurrency());
            response.setStatus(payment.getStatus());
            response.setMessage("Order found");
        } else {
            response.setSuccess(false);
            response.setMessage("Order not found");
            response.setOrderId(orderId);
        }
        return response;
    }

    // ─────────────────────────────────────────────
    // COD: mark cash collected at delivery
    // ─────────────────────────────────────────────

    @Override
    @Transactional
    public PaymentResponse markCodCollected(String orderNumber) {
        PaymentTransaction txn = paymentRepository.findByOrderNumber(orderNumber)
                .orElse(null);

        PaymentResponse response = new PaymentResponse();

        if (txn == null) {
            // No record yet — create one now (edge case: COD record failed during order creation)
            PaymentTransaction newTxn = new PaymentTransaction();
            newTxn.setOrderNumber(orderNumber);
            newTxn.setPaymentMethod("CASH_ON_DELIVERY");
            newTxn.setCurrency("INR");
            newTxn.setStatus(PaymentStatus.COLLECTED);
            newTxn.setPaymentTxnId("COD-COLLECTED-" + UUID.randomUUID());
            newTxn.setCreatedAt(LocalDateTime.now());
            paymentRepository.save(newTxn);

            response.setSuccess(true);
            response.setTransactionId(newTxn.getPaymentTxnId());
            response.setMessage("COD payment recorded and marked as collected");
            response.setCreatedAt(LocalDateTime.now());
            return response;
        }

        if (txn.getStatus() == PaymentStatus.COLLECTED) {
            response.setSuccess(true);
            response.setTransactionId(txn.getPaymentTxnId());
            response.setMessage("Already marked as collected");
            response.setCreatedAt(LocalDateTime.now());
            return response;
        }

        txn.setStatus(PaymentStatus.COLLECTED);
        paymentRepository.save(txn);

        response.setSuccess(true);
        response.setTransactionId(txn.getPaymentTxnId());
        response.setMessage("COD cash collected successfully");
        response.setCreatedAt(LocalDateTime.now());
        return response;
    }

    // ─────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────

    /**
     * Save a record to payment_transactions after a successful Razorpay payment.
     * This keeps the transactions table populated for admin reporting.
     */
    private void savePaymentTransaction(PaymentRequest request, String orderId,
                                        String paymentId, String method, String statusStr) {
        try {
            PaymentTransaction txn = new PaymentTransaction();
            txn.setOrderNumber(request.getOrderNumber() != null ? request.getOrderNumber() : orderId);
            txn.setPaymentTxnId(paymentId);
            txn.setPaymentMethod(method);
            txn.setCurrency(request.getCurrency() != null ? request.getCurrency() : "INR");

            // Amount: Razorpay sends paise, convert back to rupees for storage
            if (request.getAmount() != null) {
                txn.setAmount(request.getAmount());
            } else if (request.getRazorpayAmount() != null) {
                txn.setAmount(java.math.BigDecimal.valueOf(request.getRazorpayAmount() / 100.0));
            }

            txn.setStatus(PaymentStatus.valueOf(statusStr));
            txn.setCreatedAt(LocalDateTime.now());
            paymentRepository.save(txn);
        } catch (Exception e) {
            // Don't fail the payment verification if transaction logging fails
            System.err.println("⚠️ Failed to save payment_transaction record: " + e.getMessage());
        }
    }

    private String generateHmacSHA256(String payload, String secret)
            throws NoSuchAlgorithmException, InvalidKeyException {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
        byte[] hash = mac.doFinal(payload.getBytes());
        StringBuilder hex = new StringBuilder();
        for (byte b : hash) {
            String h = Integer.toHexString(0xff & b);
            if (h.length() == 1) hex.append('0');
            hex.append(h);
        }
        return hex.toString();
    }
}
