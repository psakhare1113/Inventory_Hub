package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.model.Refund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefundRepository extends JpaRepository<Refund, Long> {
    Optional<Refund> findByRefundReference(String refundReference);
}
