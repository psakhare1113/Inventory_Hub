package com.pixelbloom.orders.serviceImpl;
import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.model.CustomerDetails;
import com.pixelbloom.orders.model.CustomerProfileResponse;
import com.pixelbloom.orders.model.Order;
import com.pixelbloom.orders.model.OrderItem;
import com.pixelbloom.orders.repository.CustomerDetailsRepository;
import com.pixelbloom.orders.repository.OrderItemRepository;
import com.pixelbloom.orders.repository.OrderRepository;
import com.pixelbloom.orders.requestEntity.CustomerAddressRequest;

import com.pixelbloom.orders.responseEntity.OrderItemResponse;
import com.pixelbloom.orders.responseEntity.OrderResponse;
import com.pixelbloom.orders.restClients.ProductsClient;
import com.pixelbloom.orders.service.CustomerdetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerdetailsServiceImpl implements CustomerdetailsService {

    private final CustomerDetailsRepository customerDetailsRepository;
    private final OrderRepository orderRepository;
    private final ProductsClient productsClient;
    private final OrderItemRepository orderItemRepository;


    @Override
    public CustomerDetails saveAddress(CustomerDetails address) {
        return customerDetailsRepository.save(address);
    }

    @Override
    public void deleteAddress(Long customerId) {
        customerDetailsRepository.deleteById(customerId);
    }

    @Override
    public CustomerDetails CustomerDetailsById(Long customerId) {
        return customerDetailsRepository.findById(customerId).orElse(null);
    }

    @Override
    public CustomerDetails updateAddress(Long customerId, CustomerAddressRequest request) {
        CustomerDetails customer = customerDetailsRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        customer.setAddressLine1(request.getAddressLine1());
        customer.setAddressLine2(request.getAddressLine2());
        customer.setCity(request.getCity());
        customer.setState(request.getState());
        customer.setPincode(request.getPincode());
        customer.setCountry(request.getCountry());

        return customerDetailsRepository.save(customer);
    }

    @Override
    public CustomerProfileResponse getCustomerProfile(Long customerId) {
        CustomerDetails customer = CustomerDetailsById(customerId);
        if (customer == null) {
            throw new RuntimeException("Customer not found");
        }

        // Get order count
        int totalOrders = orderRepository.findByCustomerId(customerId).size();

        // Get reviews count from products-service - handle gracefully if service is down
        List<Object> reviews = List.of(); // Default to empty list
        try {
            reviews = productsClient.getCustomerReviews(customerId);
            if (reviews == null) {
                reviews = List.of();
            }
        } catch (Exception e) {
            // Log the error but continue with empty reviews
            // reviews remains as empty list
        }

        return CustomerProfileResponse.builder()
                .customerId(customer.getCustomerId())
                .firstName(customer.getFirstName())
                .lastName(customer.getLastName())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .addressLine1(customer.getAddressLine1())
                .city(customer.getCity())
                .state(customer.getState())
                .pincode(customer.getPincode())
                .profilePicUrl("/api/files/profile/" + customerId + ".jpg")
                .status(customer.getStatus().name())
                .totalOrders(totalOrders)
                .totalReviews(reviews.size())
                .build();
    }


    public OrderResponse.ReviewSummary buildReviewSummary(List<OrderItemResponse> items) {
        int totalItems = items.size();
        int reviewedItems = (int) items.stream().filter(OrderItemResponse::isHasReviewed).count();
        int pendingReviews = (int) items.stream().filter(item -> item.isCanReview() && !item.isHasReviewed()).count();
        return OrderResponse.ReviewSummary.builder().totalItems(totalItems).reviewedItems(reviewedItems)
                .pendingReviews(pendingReviews).allItemsReviewed(reviewedItems == totalItems && totalItems > 0).build();
    }

     /**
     * Get orders by customer ID and optional status filter
     */
    @Override
    public List<OrderResponse> getOrdersByCustomerAndStatus(Long customerId, OrderStatus orderStatus) {
        List<Order> orders = orderStatus != null
                ? orderRepository.findByCustomerIdAndOrderStatus(customerId, orderStatus)
                : orderRepository.findByCustomerId(customerId);

        return orders.stream()
                .map(this::convertToOrderResponse)
                .toList();
    }

    /**
     * Get all orders by optional status filter
     */
    @Override
    public List<OrderResponse> getAllOrdersByStatus(OrderStatus status) {
        List<Order> orders = status != null
                ? orderRepository.findByOrderStatus(status)
                : orderRepository.findAll();
        return orders.stream()
                .map(this::convertToOrderResponse)
                .toList();
    }

    @Override
    public List<OrderResponse> getOrdersBySaleDate(LocalDate startDate, LocalDate endDate) {
        List<Order> orders = orderRepository.findByCreatedAtBetween(
                startDate.atStartOfDay(),
                endDate.atTime(23, 59, 59)
        );
        return orders.stream()
                .map(this::convertToOrderResponse)
                .toList();
    }

    private OrderResponse convertToOrderResponse(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderNumber(order.getOrderNumber());
        List<OrderItemResponse> itemResponses = mapToOrderItemResponsesWithReviews(items, order.getCustomerId());
        return OrderResponse.builder()
                .orderNumber(order.getOrderNumber()).totalAmount(order.getTotalAmount())
                .orderStatus(order.getOrderStatus().name()).createdAt(order.getCreatedAt())
                .deliveredAt(order.getDeliveredAt()).items(itemResponses)
                .reviewSummary(buildReviewSummary(itemResponses)).build();
    }


    public List<OrderItemResponse> mapToOrderItemResponsesWithReviews(List<OrderItem> items, Long customerId) {
        return items.stream()
                .map(item -> {
                    // Check if customer can review (order must be delivered)
                    boolean canReview = item.getOrderStatus() == OrderStatus.DELIVERED;

                    // Check if customer has already reviewed this product
                    boolean hasReviewed = false;
                    String reviewId = null;

                    if (canReview) {
                        try {
                            Object existingReview = productsClient.getProductReviewByCustomer(item.getProductId(), customerId);
                            hasReviewed = existingReview != null;
                            if (hasReviewed) {
                                // Extract review ID from response if needed
                                reviewId = "review_" + item.getProductId() + "_" + customerId;
                            }
                        } catch (Exception e) {
                            // Review not found or service error
                            hasReviewed = false;
                        }
                    }

                    return OrderItemResponse.builder().productId(item.getProductId())
                            .barcode(item.getBarcode()).quantity(item.getQuantity())
                            .unitPrice(item.getUnitPrice()).totalPrice(item.getTotalPrice())
                            .orderStatus(item.getOrderStatus()).deliveredAt(item.getDeliveredAt())
                            .canReview(canReview).hasReviewed(hasReviewed)
                            .reviewId(reviewId).writeReviewUrl(canReview && !hasReviewed ? "/api/auth/user/products/reviews/write?productId=" + item.getProductId() + "&orderNumber=" + item.getOrderNumber() : null)
                            .viewReviewUrl(hasReviewed ?"/api/auth/user/products/reviews/" + reviewId : null).build();}).toList();
    }




}