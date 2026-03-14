package com.pixelbloom.payment.repository;

import com.pixelbloom.payment.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String> {

   Optional<PaymentTransaction> findByOrderNumber(String orderNumber);
}
