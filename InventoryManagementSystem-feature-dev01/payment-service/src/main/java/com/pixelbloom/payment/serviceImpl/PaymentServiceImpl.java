package com.pixelbloom.payment.serviceImpl;

import com.pixelbloom.payment.constants.PaymentStatus;
import com.pixelbloom.payment.constants.RefundStatus;
import com.pixelbloom.payment.entity.PaymentTransaction;
import com.pixelbloom.payment.entity.RefundTransaction;
import com.pixelbloom.payment.repository.PaymentRefundRepository;
import com.pixelbloom.payment.repository.PaymentTransactionRepository;
import com.pixelbloom.payment.requestDto.PaymentRequest;
import com.pixelbloom.payment.requestDto.RefundRequest;
import com.pixelbloom.payment.responseDto.GatewayResponse;
import com.pixelbloom.payment.responseDto.PaymentResponse;
import com.pixelbloom.payment.responseDto.RefundResponse;
import com.pixelbloom.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {
    private final PaymentTransactionRepository paymentRepository;
    private final PaymentRefundRepository paymentRefundRepository;
    //private final PaymentGateway paymentGateway;

    @Override
    public PaymentResponse processPayment(PaymentRequest request) {
                PaymentTransaction txn = new PaymentTransaction();
                txn.setOrderNumber(request.getOrderNumber());
                txn.setAmount(request.getAmount());
                txn.setCurrency(request.getCurrency());
                txn.setPaymentMethod(request.getPaymentMethod());
                txn.setCreatedAt(LocalDateTime.now());

                // MOCK GATEWAY LOGIC
                boolean success = request.getAmount().compareTo(BigDecimal.ZERO)> 0;

                //boolean paymentGatewaySuccess = gateway.payAmount();
                //for now iam directly setting to true but its should run paymentGatewway logic and return true..
        //
         ///  ToDo payment Gatway logic call from here and return true or false

                boolean paymentGatewaySuccess = true;

                if (paymentGatewaySuccess) {
                    txn.setStatus(PaymentStatus.SUCCESS);
                    txn.setPaymentTxnId(UUID.randomUUID().toString());
                } else {
                    txn.setStatus(PaymentStatus.FAILED);
                }

                paymentRepository.save(txn);

                PaymentResponse response = new PaymentResponse();
                response.setSuccess(success);
                response.setTransactionId(txn.getPaymentTxnId());
                response.setCreatedAt(LocalDateTime.now());
                return response;
            }


    public RefundResponse processRefundPayment(RefundRequest request) {

        PaymentTransaction payment = paymentRepository.findByOrderNumber(request.getOrderNumber())
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            return new RefundResponse(false, request.getOrderNumber(), "Already refunded");
        }

        // 1️⃣ Create refund record
        RefundTransaction refund = paymentRefundRepository.save(
                RefundTransaction.builder()
                        .orderNumber(request.getOrderNumber())
                        .refundTxnId(payment.getPaymentTxnId())
                        .refundAmount(payment.getAmount())
                        .refundReason(request.getRefundReason())
                        .refundStatus(RefundStatus.INITIATED)
                        .refundedAt(LocalDateTime.now())
                        .build()
        );

        // 2️⃣ Call payment gateway  //  ToDo payment Gateway logic call from here and return true or false

       // GatewayResponse gatewayResponse = paymentGateway.refund(orderNumber, payment.getAmount());
        GatewayResponse gatewayResponse = new GatewayResponse();
          boolean paymentGatewaySuccess1= gatewayResponse.isSuccess();
          String gatewayTxnId = UUID.randomUUID().toString();//gatewayResponse.getGatewayTxnId();

        boolean paymentGatewaySuccess=true;
        if (!paymentGatewaySuccess) {
            // 3️⃣ Update refund record
            refund.setRefundStatus(RefundStatus.FAILED);
            refund.setRefundedAt(LocalDateTime.now());
            paymentRefundRepository.save(refund);
            return new RefundResponse(request.getOrderNumber(),request.getRefundAmount(), request.getCurrency(), refund.getRefundStatus(), gatewayTxnId,request.getPaymentSource(), refund.getRefundedAt(),"Refund failed try initiating Refund process again!");
        }
        // 3️⃣ Update refund record
        refund.setRefundStatus(RefundStatus.SUCCESS);
        refund.setRefundedAt(LocalDateTime.now());
        refund.setRefundTxnId(gatewayTxnId);
        paymentRefundRepository.save(refund);

        // 4️⃣ Update original payment
        payment.setStatus(PaymentStatus.REFUNDED);
        paymentRepository.save(payment);
        return new RefundResponse(request.getOrderNumber(),request.getRefundAmount(), request.getCurrency(), refund.getRefundStatus(), gatewayTxnId,request.getPaymentSource(),refund.getRefundedAt(),"Refund successful");
    }
}


