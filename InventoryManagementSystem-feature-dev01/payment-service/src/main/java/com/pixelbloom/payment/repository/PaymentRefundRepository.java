package com.pixelbloom.payment.repository;

import com.pixelbloom.payment.entity.RefundTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRefundRepository extends JpaRepository<RefundTransaction , String> {
}
