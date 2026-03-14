package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.model.OrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderStatusHistoryRepository  extends JpaRepository<OrderStatusHistory, Long> {

    boolean existsByOrderId(Long orderId);

    Optional<OrderStatusHistory> findTopByOrderIdOrderByChangedAtDesc(Long orderId);
}