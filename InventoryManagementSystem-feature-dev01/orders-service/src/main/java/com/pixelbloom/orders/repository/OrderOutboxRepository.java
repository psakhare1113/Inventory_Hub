package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.model.OrderOutbox;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderOutboxRepository extends JpaRepository<OrderOutbox, Long> {
    //List<OrderOutbox> findTop50ByStatusOrderByCreatedAtAsc(@Param("status") String status, Pageable pageable);

    List<OrderOutbox> findByStatusIn(List<String> list);

    List<OrderOutbox> findTop50ByStatusInOrderByCreatedAtAsc(List<String> statuses, PageRequest pageRequest);

}
