package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.model.CustomerDetails;
import com.pixelbloom.orders.requestEntity.CustomerAddressRequest;
import com.pixelbloom.orders.service.CustomerdetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerdetailsService customerdetailsService;

    // address management endpoints
    @PostMapping("/addCustomerDetails")
    public ResponseEntity<CustomerDetails> addCustomerDetails(@RequestBody CustomerDetails details) {
        return ResponseEntity.ok(customerdetailsService.saveAddress(details));
    }

    @PutMapping("/updateAddresses/{customerId}")
    public ResponseEntity<CustomerDetails> updateAddress(@PathVariable Long customerId, @RequestBody CustomerAddressRequest request) {
          return ResponseEntity.ok(customerdetailsService.updateAddress(customerId,request));
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


}
