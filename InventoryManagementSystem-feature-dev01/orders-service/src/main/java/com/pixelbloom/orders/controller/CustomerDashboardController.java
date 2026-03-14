package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.model.CustomerProfileResponse;
import com.pixelbloom.orders.responseEntity.OrderResponse;
import com.pixelbloom.orders.restClients.ProductsClient;
import com.pixelbloom.orders.service.CustomerdetailsService;
import com.pixelbloom.orders.service.OrderService;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class CustomerDashboardController {

    private final CustomerdetailsService customerdetailsService;
    private final OrderService orderService;
    private final ProductsClient productsClient;

    // ===== USER ENDPOINTS =====

    @GetMapping("/customersProfile")
    public ResponseEntity<CustomerProfileResponse> getProfile(
            @RequestHeader("X-Customer-Id") Long customerId) {
        CustomerProfileResponse profile = customerdetailsService.getCustomerProfile(customerId);
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/customersOrders")
    public ResponseEntity<List<OrderResponse>> getMyOrders(
            @RequestHeader("X-Customer-Id") Long customerId,
            @RequestParam(required = false) String status) {
        List<OrderResponse> orders = customerdetailsService.getOrdersByCustomerAndStatus(customerId,
                status != null ? OrderStatus.valueOf(status) : null);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/customersTransactions")
    public ResponseEntity<List<Object>> getMyTransactions(
            @RequestHeader("X-Customer-Id") Long customerId) {
        // TODO: Implement payment transactions
        return ResponseEntity.ok(List.of());
    }

     // ===== ADMIN ENDPOINTS =====

    @GetMapping("/admin/orders")
    public ResponseEntity<List<OrderResponse>> getAllOrdersByStatus(
            @RequestParam(required = false) String status) {
        List<OrderResponse> orders = customerdetailsService.getAllOrdersByStatus(
                status != null ? OrderStatus.valueOf(status) : null);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/admin/orders/by-date")
    public ResponseEntity<List<OrderResponse>> getOrdersBySaleDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<OrderResponse> orders = customerdetailsService.getOrdersBySaleDate(startDate, endDate);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/customers/{customerId}/orders")
    public ResponseEntity<List<OrderResponse>> getCustomerOrdersAdmin(
            @PathVariable Long customerId,
            @RequestParam(required = false) String status) {
        List<OrderResponse> orders = customerdetailsService.getOrdersByCustomerAndStatus(customerId,
                status != null ? OrderStatus.valueOf(status) : null);
        return ResponseEntity.ok(orders);
    }


    @GetMapping("/customersReviews")
    public ResponseEntity<List<Object>> getMyReviews(@RequestHeader("X-Customer-Id") Long customerId) {
        try {
            List<Object> reviews = productsClient.getCustomerReviews(customerId);
            return ResponseEntity.ok(reviews);
        } catch (FeignException.NotFound e) {
            // Return empty list if no reviews found or endpoint doesn't exist
            return ResponseEntity.ok(List.of());
        }
    }

    @PostMapping("/reviews")
    public ResponseEntity<Object> submitReview(@RequestHeader("X-Customer-Id") Long customerId, @RequestBody Map<String, Object> reviewRequest) {
        try {
            reviewRequest.put("customerId", customerId);
            Object review = productsClient.submitReview(reviewRequest);
            return ResponseEntity.ok(review);
        } catch (FeignException.NotFound e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/reviews/product/{productId}")
    public ResponseEntity<Object> getMyProductReview(
            @RequestHeader("X-Customer-Id") Long customerId,
            @PathVariable Long productId) {
        try {
            Object review = productsClient.getProductReviewByCustomer(productId, customerId);
            return ResponseEntity.ok(review);
        } catch (FeignException.NotFound e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Customer-specific endpoints using JWT
    @GetMapping("/my-orders")
    public ResponseEntity<List<OrderResponse>> getMyOrders(@RequestHeader("X-Customer-Id") Long customerId) {
        return ResponseEntity.ok(customerdetailsService.getOrdersByCustomerAndStatus(customerId, null));
    }


}
