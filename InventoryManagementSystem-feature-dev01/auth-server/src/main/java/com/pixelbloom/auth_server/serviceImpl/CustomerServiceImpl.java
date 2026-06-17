package com.pixelbloom.auth_server.serviceImpl;

import com.pixelbloom.auth_server.enums.CustomerStatus;
import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.repository.CustomerRepository;
import com.pixelbloom.auth_server.service.CustomerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CustomerServiceImpl implements CustomerService {
      @Autowired
      CustomerRepository customerRepository;

        @Override
        public Optional<Customer> findByEmail(String email) {
            return customerRepository.findByEmail(email);
        }

        @Override
        public Optional<Customer> findById(Long id) {
            return customerRepository.findById(id);
        }

        @Override
        public void updateStatus(Long customerId, CustomerStatus status) {
            Customer customer = findById(customerId)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            customer.setStatus(status);
            customerRepository.save(customer);
        }

        @Override
        public List<Customer> findAll() {
            return customerRepository.findAll();
        }

        @Override
        public void updateCustomer(Customer customer) {
            customerRepository.save(customer);
        }

        @Override
        public void deleteCustomer(Long customerId) {
            if (!customerRepository.existsById(customerId)) {
                throw new RuntimeException("Customer not found with id: " + customerId);
            }
            customerRepository.deleteById(customerId);
        }
}
