package com.pixelbloom.payment.repository;

import com.pixelbloom.payment.entity.GatewayPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GatewayPaymentRepository extends JpaRepository<GatewayPayment, Long> {
    GatewayPayment findByTransactionId(String transactionId);
    GatewayPayment findByPaymentId(String paymentId);
    GatewayPayment findByOrderId(String orderId);
}
