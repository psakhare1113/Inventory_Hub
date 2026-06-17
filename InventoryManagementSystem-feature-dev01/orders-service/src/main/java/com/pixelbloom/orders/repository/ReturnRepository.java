package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.enums.ReturnStatus;
import com.pixelbloom.orders.model.Return;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReturnRepository extends JpaRepository<Return, Long> {

    Optional<Return> findByOrderNumber(String orderNumber);

    Optional<Return> findByOrderNumberAndBarcode(String orderNumber, String barcode);

    Optional<Return> findByReturnReference(String returnReference);

    // Used by delivery boy dashboard — fetch all pending return pickups
    List<Return> findByReturnStatus(ReturnStatus returnStatus);
}

