package com.pixelbloom.shipping.serviceImpls;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.shipping.client.CustomerDetailsResponse;
import com.pixelbloom.shipping.client.OrdersCustomerClient;
import com.pixelbloom.shipping.event.OrderCreatedEvent;
import com.pixelbloom.shipping.event.ShipmentDeliveredEvent;
import com.pixelbloom.shipping.model.Shipment;
import com.pixelbloom.shipping.publisher.ShipmentEventPublisher;
import com.pixelbloom.shipping.repository.ShipmentRepository;
import com.pixelbloom.shipping.service.ShippingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShippingServiceImpl implements ShippingService {
    private final ShipmentRepository shipmentRepository;
    private final OrdersCustomerClient ordersCustomerClient;
    private final ShipmentEventPublisher eventPublisher;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public void createShipment(OrderCreatedEvent event) {
        try {
            CustomerDetailsResponse customer = ordersCustomerClient.getCustomerDetails(event.getCustomerId());

            log.info("Shipment customer details from createShipment: {}", customer);

            String customerAddress = Stream.of(
                            customer.getAddressLine1(),
                            customer.getAddressLine2(),
                            customer.getCity(),
                            customer.getState() + " - " + customer.getPincode()
                    )
                    .filter(s -> s != null && !s.isBlank())
                    .collect(Collectors.joining(", "));
            log.info("Shipment customerAddress --> from createShipment: {}", customerAddress);
            Shipment shipment = Shipment.builder()
                    .orderNumber(event.getOrderNumber())
                    .customerId(event.getCustomerId())
                    .shippingAddress(customerAddress)
                    .status("CREATED")
                    .createdAt(LocalDateTime.now())
                    .build();

            shipmentRepository.save(shipment);
            log.info("Shipment created =======================>>>: {}",shipment);
        } catch (Exception e) {
            log.error("Failed to create shipment for order: {}", event.getOrderNumber(), e);

            // Create shipment with default address
            Shipment shipment = Shipment.builder()
                    .orderNumber(event.getOrderNumber())
                    .customerId(event.getCustomerId())
                    .shippingAddress("Address not available")
                    .status("PENDING_ADDRESS")
                    .createdAt(LocalDateTime.now())
                    .build();

            shipmentRepository.save(shipment);
        }
    }
    @Override
    @Transactional
    public void markDelivered(String orderNumber) {
        Shipment shipment = shipmentRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new RuntimeException("Shipment not found"));

        LocalDateTime deliveredAt = LocalDateTime.now();
        shipment.setStatus("DELIVERED");
        shipment.setDeliveredAt(deliveredAt);
        shipmentRepository.save(shipment);

        ShipmentDeliveredEvent event = ShipmentDeliveredEvent.builder()
                .orderNumber(orderNumber)
                .deliveredAt(deliveredAt)
                .build();

        eventPublisher.publishShipmentDelivered(event);
        log.info("Shipment delivered for order: {}", orderNumber);
    }

 public void getAddress(){
      Long customerId=1L;
     CustomerDetailsResponse customer = ordersCustomerClient.getCustomerDetails(customerId);

     log.info("Shipment customer details from createShipment: {}", customer);

     String customerAddress = Stream.of(
                     customer.getAddressLine1(),
                     customer.getAddressLine2(),
                     customer.getCity(),
                     customer.getState() + " - " + customer.getPincode()
             )
             .filter(s -> s != null && !s.isBlank())
             .collect(Collectors.joining(", "));
     log.info("Shipment customerAddress --> from createShipment: {}", customerAddress);
 }
}