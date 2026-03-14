package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrderNumber(String orderNumber);


    Optional<OrderItem> findByOrderNumberAndBarcode(
            String orderNumber,
            String barcode
    );
}
