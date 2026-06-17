package com.pixelbloom.orders.serviceImpl;
import com.pixelbloom.orders.enums.OrderStatus;
import com.pixelbloom.orders.model.CustomerDetails;
import com.pixelbloom.orders.model.CustomerProfileResponse;
import com.pixelbloom.orders.model.Order;
import com.pixelbloom.orders.model.OrderItem;
import com.pixelbloom.orders.repository.CustomerDetailsRepository;
import com.pixelbloom.orders.repository.DeliveryAssignmentRepository;
import com.pixelbloom.orders.repository.OrderItemRepository;
import com.pixelbloom.orders.repository.OrderRepository;
import com.pixelbloom.orders.requestEntity.CustomerAddressRequest;
import com.pixelbloom.orders.responseEntity.OrderItemResponse;
import com.pixelbloom.orders.responseEntity.OrderResponse;
import com.pixelbloom.orders.restClients.ProductsClient;
import com.pixelbloom.orders.service.CustomerdetailsService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerdetailsServiceImpl implements CustomerdetailsService {

    private final CustomerDetailsRepository customerDetailsRepository;
    private final OrderRepository orderRepository;
    private final ProductsClient productsClient;
    private final OrderItemRepository orderItemRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;


    @Override
    public CustomerDetails saveAddress(CustomerDetails address) {
        // Upsert by customerId (PK)
        if (address.getCustomerId() != null) {
            CustomerDetails existing = customerDetailsRepository.findById(address.getCustomerId()).orElse(null);
            if (existing != null) {
                // Update existing record
                existing.setFirstName(address.getFirstName());
                existing.setLastName(address.getLastName());
                existing.setEmail(address.getEmail());
                existing.setPhone(address.getPhone());
                existing.setGender(address.getGender());
                existing.setTitle(address.getTitle());
                existing.setStatus(address.getStatus());
                existing.setAddressLine1(address.getAddressLine1());
                existing.setAddressLine2(address.getAddressLine2());
                existing.setCity(address.getCity());
                existing.setState(address.getState());
                existing.setPincode(address.getPincode());
                existing.setCountry(address.getCountry());
                existing.setIsDefault(address.getIsDefault());
                existing.setUpdatedAt(java.time.LocalDateTime.now());
                return customerDetailsRepository.save(existing);
            }
            // No existing record — insert new with given customerId as PK
            if (address.getCreatedAt() == null) address.setCreatedAt(java.time.LocalDateTime.now());
            if (address.getUpdatedAt() == null) address.setUpdatedAt(java.time.LocalDateTime.now());
            return customerDetailsRepository.save(address);
        }
        throw new RuntimeException("customerId is required to save customer details");
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
    public List<CustomerDetails> getAllCustomerDetails() {
        return customerDetailsRepository.findAll();
    }

    @Override
    public long getCustomerCount() {
        return customerDetailsRepository.count();
    }

    @Override
    public void createTestCustomerData() {
        // Only create if no customers exist
        if (customerDetailsRepository.count() == 0) {
            CustomerDetails customer1 = CustomerDetails.builder()
                    .firstName("John")
                    .lastName("Doe")
                    .email("john.doe@example.com")
                    .gender("male")
                    .title("Mr")
                    .status(com.pixelbloom.orders.enums.CustomerStatus.ACTIVE)
                    .addressLine1("123 Main Street")
                    .city("New York")
                    .state("NY")
                    .pincode("10001")
                    .country("USA")
                    .phone("+1234567890")
                    .isDefault(true)
                    .createdAt(java.time.LocalDateTime.now())
                    .updatedAt(java.time.LocalDateTime.now())
                    .build();

            CustomerDetails customer2 = CustomerDetails.builder()
                    .firstName("Jane")
                    .lastName("Smith")
                    .email("jane.smith@example.com")
                    .gender("female")
                    .title("Ms")
                    .status(com.pixelbloom.orders.enums.CustomerStatus.ACTIVE)
                    .addressLine1("456 Oak Avenue")
                    .city("Los Angeles")
                    .state("CA")
                    .pincode("90001")
                    .country("USA")
                    .phone("+1234567891")
                    .isDefault(true)
                    .createdAt(java.time.LocalDateTime.now())
                    .updatedAt(java.time.LocalDateTime.now())
                    .build();

            customerDetailsRepository.save(customer1);
            customerDetailsRepository.save(customer2);
        }
    }

    @Override
    public CustomerDetails updateAddress(Long customerId, CustomerAddressRequest request) {
        CustomerDetails customer = customerDetailsRepository.findById(customerId).orElse(null);

        if (customer == null) {
            customer = CustomerDetails.builder()
                    .customerId(customerId)
                    .status(com.pixelbloom.orders.enums.CustomerStatus.ACTIVE)
                    .isDefault(false)
                    .createdAt(java.time.LocalDateTime.now())
                    .build();
        }

        customer.setAddressLine1(request.getAddressLine1());
        customer.setAddressLine2(request.getAddressLine2());
        customer.setCity(request.getCity());
        customer.setState(request.getState());
        customer.setPincode(request.getPincode());
        customer.setCountry(request.getCountry());
        if (request.getPhone() != null) customer.setPhone(request.getPhone());
        customer.setUpdatedAt(java.time.LocalDateTime.now());

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
                .filter(o -> o != null && o.getOrderNumber() != null)
                .map(order -> {
                    try {
                        return convertToOrderResponse(order);
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(r -> r != null)
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
                .filter(o -> o != null && o.getOrderNumber() != null)
                .map(order -> {
                    try {
                        return convertToOrderResponse(order);
                    } catch (Exception e) {
                        // Skip bad records, never crash the whole list
                        return null;
                    }
                })
                .filter(r -> r != null)
                .toList();
    }

    @Override
    public List<OrderResponse> getOrdersBySaleDate(LocalDate startDate, LocalDate endDate) {
        List<Order> orders = orderRepository.findByCreatedAtBetween(
                startDate.atStartOfDay(),
                endDate.atTime(23, 59, 59)
        );
        return orders.stream()
                .filter(o -> o != null && o.getOrderNumber() != null)
                .map(order -> {
                    try {
                        return convertToOrderResponse(order);
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(r -> r != null)
                .toList();
    }

    private OrderResponse convertToOrderResponse(Order order) {
        try {
            List<OrderItem> items = orderItemRepository.findByOrderNumber(order.getOrderNumber());
            List<OrderItemResponse> itemResponses = mapToOrderItemResponsesWithReviews(items, order.getCustomerId());

            // Enrich with delivery boy name from the latest delivery assignment
            String deliveryBoyName = null;
            Long deliveryBoyId = null;
            try {
                var assignmentOpt = deliveryAssignmentRepository
                    .findTopByOrderNumberOrderByAssignedAtDesc(order.getOrderNumber());
                if (assignmentOpt.isPresent()) {
                    var assignment = assignmentOpt.get();
                    // Only show delivery boy for regular delivery tasks (not return pickup / cash refund)
                    if (!Boolean.TRUE.equals(assignment.getIsReturnPickupTask())
                            && !Boolean.TRUE.equals(assignment.getIsCashRefundTask())) {
                        deliveryBoyName = assignment.getDeliveryBoyName();
                        deliveryBoyId   = assignment.getDeliveryBoyId();
                    }
                }
            } catch (Exception e) {
                log.debug("Could not fetch delivery assignment for order {}: {}", order.getOrderNumber(), e.getMessage());
            }

            return OrderResponse.builder()
                    .orderNumber(order.getOrderNumber())
                    .customerId(order.getCustomerId())
                    .totalAmount(order.getTotalAmount())
                    .orderStatus(order.getOrderStatus() != null ? order.getOrderStatus().name() : "UNKNOWN")
                    .paymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null)
                    .paymentMode(order.getPaymentMode())
                    .createdAt(order.getCreatedAt())
                    .deliveredAt(order.getDeliveredAt())
                    .warehouseId(order.getWarehouseId())
                    .warehouseName(order.getWarehouseName())
                    .packingSlipNumber(order.getPackingSlipNumber())
                    .awbNumber(order.getAwbNumber())
                    .courierPartner(order.getCourierPartner())
                    .deliveryBoyName(deliveryBoyName)
                    .deliveryBoyId(deliveryBoyId)
                    .items(itemResponses)
                    .reviewSummary(buildReviewSummary(itemResponses))
                    .build();
        } catch (Exception e) {
            // Never let a single bad order crash the entire list
            return OrderResponse.builder()
                    .orderNumber(order.getOrderNumber() != null ? order.getOrderNumber() : "UNKNOWN")
                    .customerId(order.getCustomerId())
                    .totalAmount(order.getTotalAmount())
                    .orderStatus(order.getOrderStatus() != null ? order.getOrderStatus().name() : "UNKNOWN")
                    .createdAt(order.getCreatedAt())
                    .items(List.of())
                    .build();
        }
    }


    public List<OrderItemResponse> mapToOrderItemResponsesWithReviews(List<OrderItem> items, Long customerId) {
        return items.stream()
                .map(item -> {
                    boolean canReview = item.getOrderStatus() == OrderStatus.DELIVERED;
                    boolean hasReviewed = false;
                    String reviewId = null;

                    if (canReview) {
                        try {
                            Object existingReview = productsClient.getProductReviewByCustomer(item.getProductId(), customerId);
                            hasReviewed = existingReview != null;
                            if (hasReviewed) {
                                reviewId = "review_" + item.getProductId() + "_" + customerId;
                            }
                        } catch (Exception e) {
                            hasReviewed = false;
                        }
                    }

                    // Fetch actual product name & image from products-service
                    String productName  = null;
                    String productImage = null;
                    try {
                        Map<String, Object> product = productsClient.getProductById(item.getProductId());
                        if (product != null) {
                            // Product entity uses "name" field
                            Object nameObj = product.get("name");
                            if (nameObj != null) productName = nameObj.toString();

                            // Product entity uses "productUrl" for image
                            Object imgObj = product.get("productUrl");
                            if (imgObj != null) productImage = imgObj.toString();
                        }
                    } catch (Exception e) {
                        // products-service unavailable — fall back to "Product #id"
                        productName = "Product #" + item.getProductId();
                    }

                    return OrderItemResponse.builder()
                            .productId(item.getProductId())
                            .productName(productName)
                            .productImage(productImage)
                            .barcode(item.getBarcode())
                            .quantity(item.getQuantity())
                            .unitPrice(item.getUnitPrice())
                            .totalPrice(item.getTotalPrice())
                            .gstRate(item.getGstRate())
                            .gstAmount(item.getGstAmount())
                            .orderStatus(item.getOrderStatus())
                            .deliveredAt(item.getDeliveredAt())
                            .canReview(canReview)
                            .hasReviewed(hasReviewed)
                            .reviewId(reviewId)
                            .writeReviewUrl(canReview && !hasReviewed
                                    ? "/api/auth/user/products/reviews/write?productId=" + item.getProductId() + "&orderNumber=" + item.getOrderNumber()
                                    : null)
                            .viewReviewUrl(hasReviewed
                                    ? "/api/auth/user/products/reviews/" + reviewId
                                    : null)
                            .build();
                }).toList();
    }




}