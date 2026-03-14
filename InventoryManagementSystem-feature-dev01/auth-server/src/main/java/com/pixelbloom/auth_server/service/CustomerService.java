package com.pixelbloom.auth_server.service;

import com.pixelbloom.auth_server.enums.CustomerStatus;
import com.pixelbloom.auth_server.model.Customer;

import java.util.List;
import java.util.Optional;

public interface CustomerService {

    void updateStatus(Long customerId, CustomerStatus status);

    Optional<Customer> findByEmail(String email);

    Optional<Customer>  findById(Long customerId);

    List<Customer> findAll();

    void updateCustomer(Customer customer);
}
