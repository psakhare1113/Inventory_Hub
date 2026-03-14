package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.model.Pricing;
import com.pixelbloom.orders.model.RefundResponse;
import com.pixelbloom.orders.requestEntity.CreateOrderRequest;
import com.pixelbloom.orders.requestEntity.RefundRequest;
import com.pixelbloom.orders.responseEntity.OrderResponse;
import com.pixelbloom.orders.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final RefundService refundService;
    private final PricingService pricingService;
    private final CustomerdetailsService customerdetailsService;


    @PostMapping("/create")
    public OrderResponse createOrder(@RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request);
    }

    @PostMapping("/addPricing")
    public ResponseEntity<?> addPricing(@RequestBody Pricing pricing) {
        return ResponseEntity.ok(pricingService.addPricing(pricing));
    }

    @PostMapping("/refund")
    public ResponseEntity<RefundResponse> refund( @RequestBody RefundRequest refundRequest) {
        return ResponseEntity.ok(refundService.refund(refundRequest));
    }
    // Admin endpoint - keep for admin access
    @GetMapping("/customerOrder/{customerId}")
    public ResponseEntity<List<OrderResponse>> getCustomerOrders(@PathVariable Long customerId,@RequestParam(required = false) String orderStatus) {
        OrderStatus status = orderStatus != null ? OrderStatus.valueOf(orderStatus.toUpperCase()) : null;
        return ResponseEntity.ok(customerdetailsService.getOrdersByCustomerAndStatus(customerId, status));
    }

    // Admin endpoint - get all orders by status
    @GetMapping("/admin/ordersByorderStatus")
    public ResponseEntity<?> getOrdersByStatus(@RequestParam(required = false) String orderStatus){
        OrderStatus status = orderStatus != null ? OrderStatus.valueOf(orderStatus.toUpperCase()) : null;
        return ResponseEntity.ok(customerdetailsService.getAllOrdersByStatus(status));
    }


}