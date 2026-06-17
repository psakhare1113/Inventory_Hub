package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.model.CustomerDetails;
import com.pixelbloom.orders.requestEntity.CustomerAddressRequest;
import com.pixelbloom.orders.service.CustomerdetailsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class CustomerController {

    private final CustomerdetailsService customerdetailsService;

    // address management endpoints
    @PostMapping("/addCustomerDetails")
    public ResponseEntity<?> addCustomerDetails(@RequestBody CustomerDetails details) {
        try {
            log.info("Received addCustomerDetails request: customerId={}, email={}", 
                details.getCustomerId(), details.getEmail());
            CustomerDetails saved = customerdetailsService.saveAddress(details);
            log.info("Successfully saved customer details for customerId={}", details.getCustomerId());
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Failed to save customer details for customerId={}: {}", 
                details.getCustomerId(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(
                java.util.Map.of("error", e.getMessage() != null ? e.getMessage() : "Unknown error")
            );
        }
    }

    @PutMapping("/updateAddresses/{customerId}")
    public ResponseEntity<CustomerDetails> updateAddress(@PathVariable Long customerId, @RequestBody CustomerAddressRequest request) {
        try {
            return ResponseEntity.ok(customerdetailsService.updateAddress(customerId, request));
        } catch (Exception e) {
            log.error("Failed to update address for customerId {}: {}", customerId, e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    @DeleteMapping("/deleteAddresses/{customerId}")
    public ResponseEntity<?> deleteAddress(@PathVariable Long customerId) {
        customerdetailsService.deleteAddress(customerId);
        return ResponseEntity.ok("Address deleted");
    }

    @GetMapping("/customerDetails/{customerId}")
    public ResponseEntity<CustomerDetails> getCustomerDetails(@PathVariable Long customerId){
        return ResponseEntity.ok(customerdetailsService.CustomerDetailsById(customerId));
    }

    @GetMapping("/customerDetails")
    public ResponseEntity<List<CustomerDetails>> getAllCustomerDetails(){
        try {
            List<CustomerDetails> customers = customerdetailsService.getAllCustomerDetails();
            return ResponseEntity.ok(customers);
        } catch (Exception e) {
            e.printStackTrace();
            // Return empty list instead of null on error
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @GetMapping("/test")
    public ResponseEntity<String> test(){
        return ResponseEntity.ok("Orders service is running!");
    }

    @GetMapping("/customerDetails/count")
    public ResponseEntity<Long> getCustomerCount(){
        try {
            long count = customerdetailsService.getCustomerCount();
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            return ResponseEntity.ok(0L);
        }
    }

    @PostMapping("/customerDetails/createTestData")
    public ResponseEntity<String> createTestCustomerData(){
        try {
            customerdetailsService.createTestCustomerData();
            return ResponseEntity.ok("Test customer data created successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error creating test data: " + e.getMessage());
        }
    }

    @GetMapping("/customerDetails/all")
    public ResponseEntity<List<CustomerDetails>> getAllCustomersAlternative(){
        try {
            // Try to get customers by checking individual IDs
            List<CustomerDetails> customers = new ArrayList<>();
            for (long i = 1; i <= 100; i++) {
                try {
                    CustomerDetails customer = customerdetailsService.CustomerDetailsById(i);
                    if (customer != null) {
                        customers.add(customer);
                    }
                } catch (Exception e) {
                    // Customer doesn't exist, continue
                    continue;
                }
            }
            return ResponseEntity.ok(customers);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(new ArrayList<>());
        }
    }


}
