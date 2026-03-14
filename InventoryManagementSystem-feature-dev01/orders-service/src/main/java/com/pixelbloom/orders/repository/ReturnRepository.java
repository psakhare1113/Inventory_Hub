package com.pixelbloom.orders.repository;

import com.pixelbloom.orders.model.Return;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
public interface ReturnRepository extends JpaRepository<Return, Long> {

        Optional<Return> findByOrderNumber(String orderNumber);

    Optional<Return>  findByOrderNumberAndBarcode(String orderNumber, String barcode);
}

