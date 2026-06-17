package com.pixelbloom.shipping.repository;

import com.pixelbloom.shipping.dto.CustomerAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, Long> {
    List<CustomerAddress> findByCustomerId(Long customerId);
    CustomerAddress findByCustomerIdAndIsDefaultTrue(Long customerId);
}