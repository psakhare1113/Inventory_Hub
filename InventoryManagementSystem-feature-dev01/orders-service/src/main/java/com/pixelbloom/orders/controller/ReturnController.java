package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.model.RefundResponse;
import com.pixelbloom.orders.model.ReturnRequest;
import com.pixelbloom.orders.requestEntity.OrderPhysicalVerificationRequest;
import com.pixelbloom.orders.requestEntity.RefundRequest;
import com.pixelbloom.orders.responseEntity.ReturnResponse;
import com.pixelbloom.orders.service.RefundService;
import com.pixelbloom.orders.service.ReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;
    private final RefundService refundService;


    // starting point where request initiated and call to inventory-service to chaneg status = RETURN_INITIATED to be in synch with order & orderItem
    @PostMapping("/order-return-initiated-step1")
    public ResponseEntity<ReturnResponse> returnOrderInitiated(@RequestBody ReturnRequest request) {
        ReturnResponse response = returnService.initiateReturn(request);
        return ResponseEntity.ok(response);
    }
    // here delivery boy will pickup item and scan it and verify the return is good or damaged this will make entry inside inventory
    //make http://localhost:9095/api/orders/order-return-Requested
    @PostMapping("/order-return-initiate-physical-verification-step2")
    public ResponseEntity<ReturnResponse> returnOrderPhysicalVerification(@RequestBody OrderPhysicalVerificationRequest request) {
        ReturnResponse response = returnService.initiatePhysicalVerification(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/order-return-finalStep3")  //check get inspectionstatus call going to inventory-service
    public ResponseEntity<ReturnResponse> returnOrder(@RequestBody ReturnRequest request) {
       ReturnResponse response = returnService.requestReturn(request);
        return ResponseEntity.ok(response);
        }


         @PostMapping("/doRefund")
    public ResponseEntity<RefundResponse> doRefund(@RequestBody RefundRequest request) {
             RefundResponse response = refundService.refund(request);
        return ResponseEntity.ok(response);
    }
}