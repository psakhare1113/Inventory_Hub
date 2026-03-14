package com.pixelbloom.orders.service;


import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.model.CustomerDetails;
import com.pixelbloom.orders.model.CustomerProfileResponse;
import com.pixelbloom.orders.model.OrderItem;
import com.pixelbloom.orders.requestEntity.CustomerAddressRequest;
import com.pixelbloom.orders.responseEntity.OrderItemResponse;
import com.pixelbloom.orders.responseEntity.OrderResponse;

import java.time.LocalDate;
import java.util.List;

public interface CustomerdetailsService {

    CustomerDetails saveAddress(CustomerDetails address);
    void deleteAddress(Long customerId);
    CustomerDetails CustomerDetailsById(Long customerId);
    CustomerDetails updateAddress(Long customerId, CustomerAddressRequest request);


    List<OrderResponse> getOrdersByCustomerAndStatus(Long customerId, OrderStatus orderStatus);

    CustomerProfileResponse getCustomerProfile(Long customerId);

    OrderResponse.ReviewSummary buildReviewSummary(List<OrderItemResponse> itemResponses);

    List<OrderResponse> getAllOrdersByStatus(OrderStatus status);

   List<OrderResponse> getOrdersBySaleDate(LocalDate startDate, LocalDate endDate);

    List<OrderItemResponse> mapToOrderItemResponsesWithReviews(List<OrderItem> items, Long customerId);
}
