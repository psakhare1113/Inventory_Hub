package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;


@Repository
public interface OrderRepository extends JpaRepository<Order,Long> {


   Optional<Order> findByOrderNumber(String orderNumber);

    List<Order> findByCustomerIdAndOrderStatus(Long customerId, OrderStatus orderStatus);
    List<Order> findByCustomerId(Long customerId);

    List<Order> findByOrderStatus(OrderStatus status);

    List<Order> findByCreatedAtBetween(LocalDateTime localDateTime, LocalDateTime localDateTime1);
}
