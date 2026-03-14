package com.pixelbloom.inventory.repository;

import com.pixelbloom.inventory.enums.ReturnStatus;
import com.pixelbloom.inventory.model.Inventory;
import com.pixelbloom.inventory.model.InventoryReturn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReturnRepository extends JpaRepository<InventoryReturn, Long> {
        Optional<InventoryReturn> findByReturnReference(String returnReference);
        Optional<InventoryReturn> findByOrderNumberAndBarcode(String orderNumber, String barcode);
        List<InventoryReturn> findByOrderNumber(String orderNumber);
        List<InventoryReturn> findByStatus(ReturnStatus status);


}
