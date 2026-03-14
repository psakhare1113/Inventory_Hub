package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.model.RefundItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RefundItemRepository extends JpaRepository<RefundItem, Long> {
    List<RefundItem> findByRefund_Id(Long refundId);
}
