package com.pixelbloom.shipping.serviceImpls;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.shipping.client.CustomerDetailsResponse;
import com.pixelbloom.shipping.client.OrdersCustomerClient;
import com.pixelbloom.shipping.dto.CustomerAddress;
import com.pixelbloom.shipping.dto.PackageRequest;
import com.pixelbloom.shipping.event.OrderCreatedEvent;
import com.pixelbloom.shipping.event.ShipmentDeliveredEvent;
import com.pixelbloom.shipping.model.Package;
import com.pixelbloom.shipping.model.Shipment;
import com.pixelbloom.shipping.publisher.ShipmentEventPublisher;
import com.pixelbloom.shipping.repository.CustomerAddressRepository;
import com.pixelbloom.shipping.repository.PackageRepository;
import com.pixelbloom.shipping.repository.ShipmentRepository;
import com.pixelbloom.shipping.service.ShippingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShippingServiceImpl implements ShippingService {
    private final ShipmentRepository shipmentRepository;
    private final PackageRepository packageRepository;
    private final CustomerAddressRepository customerAddressRepository;
    private final OrdersCustomerClient ordersCustomerClient;
    private final ShipmentEventPublisher eventPublisher;
    private final ObjectMapper objectMapper; // injected by Spring — has JavaTimeModule registered

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
            
            // Save customer address to database
            CustomerAddress address = CustomerAddress.builder()
                    .customerId(event.getCustomerId())
                    .addressLine1(customer.getAddressLine1())
                    .addressLine2(customer.getAddressLine2())
                    .city(customer.getCity())
                    .state(customer.getState())
                    .zipCode(customer.getPincode())
                    .country("India")
                    .contactPhone(customer .getPhone())
                    .isDefault(true)
                    .createdAt(LocalDateTime.now())
                    .build();
            customerAddressRepository.save(address);
            
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
    public void markPacked(String orderNumber, Long customerId) {
        // Find existing shipment or create a new one if Kafka event was missed
        Optional<Shipment> existing = shipmentRepository.findByOrderNumber(orderNumber);
        Shipment shipment;

        if (existing.isPresent()) {
            shipment = existing.get();
        } else {
            log.warn("⚠️ No shipment found for order: {} — creating one now during pack", orderNumber);
            String resolvedAddress = "Address not available";

            if (customerId != null) {
                try {
                    List<CustomerAddress> addresses = customerAddressRepository.findByCustomerId(customerId);
                    if (!addresses.isEmpty()) {
                        CustomerAddress addr = addresses.stream()
                                .filter(CustomerAddress::isDefault)
                                .findFirst()
                                .orElse(addresses.get(0));
                        resolvedAddress = Stream.of(
                                        addr.getAddressLine1(),
                                        addr.getAddressLine2(),
                                        addr.getCity(),
                                        addr.getState() + " - " + addr.getZipCode()
                                )
                                .filter(s -> s != null && !s.isBlank())
                                .collect(Collectors.joining(", "));
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Could not resolve address for customer {}: {}", customerId, e.getMessage());
                }
            }

            shipment = Shipment.builder()
                    .orderNumber(orderNumber)
                    .customerId(customerId)
                    .shippingAddress(resolvedAddress)
                    .status("CREATED")
                    .createdAt(LocalDateTime.now())
                    .build();
            shipment = shipmentRepository.saveAndFlush(shipment);
            log.info("✅ Auto-created shipment for order: {}", orderNumber);
        }

        LocalDateTime packedAt = LocalDateTime.now();
        shipment.setStatus("PACKED");
        shipment.setPackedAt(packedAt);
        shipmentRepository.saveAndFlush(shipment);
        log.info("Shipment PACKED for order: {}", orderNumber);

        // ── Create / update Package record ──────────────────────────────────
        try {
            Optional<Package> existingPkg = packageRepository.findByOrderNumber(orderNumber);
            Package pkg;
            if (existingPkg.isPresent()) {
                pkg = existingPkg.get();
                pkg.setStatus("PACKED");
                pkg.setPackedAt(packedAt);
            } else {
                pkg = Package.builder()
                        .orderNumber(orderNumber)
                        .customerId(customerId)
                        .status("PACKED")
                        .createdAt(packedAt)
                        .packedAt(packedAt)
                        .build();
            }
            packageRepository.save(pkg);
            log.info("✅ Package record saved for order: {}", orderNumber);
        } catch (Exception e) {
            log.warn("⚠️ Could not save Package record for order {}: {}", orderNumber, e.getMessage());
        }
    }

    @Override
    @Transactional
    public void markShipped(String orderNumber, String trackingNumber, String courierPartner, Double cost) {
        Optional<Shipment> existing = shipmentRepository.findByOrderNumber(orderNumber);
        Shipment shipment;

        if (existing.isPresent()) {
            shipment = existing.get();
        } else {
            // Shipment still missing — create it now (pack may have failed silently)
            log.warn("⚠️ No shipment found for order: {} during ship — creating now", orderNumber);
            shipment = Shipment.builder()
                    .orderNumber(orderNumber)
                    .shippingAddress("Address not available")
                    .status("PACKED")
                    .createdAt(LocalDateTime.now())
                    .packedAt(LocalDateTime.now())
                    .build();
            shipment = shipmentRepository.saveAndFlush(shipment);
        }

        LocalDateTime shippedAt = LocalDateTime.now();
        shipment.setStatus("SHIPPED");
        shipment.setTrackingNumber(trackingNumber);
        shipment.setCourierPartner(courierPartner);
        if (cost != null) shipment.setCost(cost);
        shipment.setShippedAt(shippedAt);
        shipmentRepository.save(shipment);
        log.info("Shipment SHIPPED for order: {} | Tracking: {} | Courier: {} | Cost: {}", orderNumber, trackingNumber, courierPartner, cost);

        // ── Update Package record to SHIPPED ────────────────────────────────
        try {
            Optional<Package> existingPkg = packageRepository.findByOrderNumber(orderNumber);
            if (existingPkg.isPresent()) {
                Package pkg = existingPkg.get();
                pkg.setStatus("SHIPPED");
                pkg.setShippedAt(shippedAt);
                packageRepository.save(pkg);
                log.info("✅ Package record updated to SHIPPED for order: {}", orderNumber);
            }
        } catch (Exception e) {
            log.warn("⚠️ Could not update Package record to SHIPPED for order {}: {}", orderNumber, e.getMessage());
        }

        // Sync order status to SHIPPED in orders-service
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            String ordersUrl = "http://localhost:9095/api/auth/admin/orders/" + orderNumber + "/status?status=SHIPPED";
            restTemplate.patchForObject(ordersUrl, null, String.class);
            log.info("✅ Order status synced to SHIPPED for order: {}", orderNumber);
        } catch (Exception e) {
            log.warn("⚠️ Could not sync order status to SHIPPED for order: {} — {}", orderNumber, e.getMessage());
            // Non-critical: frontend also calls the status update endpoint directly
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

        // ── Update Package record to DELIVERED ──────────────────────────────
        try {
            Optional<Package> existingPkg = packageRepository.findByOrderNumber(orderNumber);
            if (existingPkg.isPresent()) {
                Package pkg = existingPkg.get();
                pkg.setStatus("DELIVERED");
                pkg.setDeliveredAt(deliveredAt);
                packageRepository.save(pkg);
                log.info("✅ Package record updated to DELIVERED for order: {}", orderNumber);
            }
        } catch (Exception e) {
            log.warn("⚠️ Could not update Package record to DELIVERED for order {}: {}", orderNumber, e.getMessage());
        }

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

    @Override
    public List<Shipment> getAllShipments() {
        List<Shipment> shipments = shipmentRepository.findAll();

        // For shipments that failed to resolve an address at creation time,
        // attempt to look up the address from customer_addresses now.
        shipments.forEach(shipment -> {
            if ("PENDING_ADDRESS".equals(shipment.getStatus()) ||
                    "Address not available".equals(shipment.getShippingAddress())) {
                try {
                    List<CustomerAddress> addresses = customerAddressRepository.findByCustomerId(shipment.getCustomerId());
                    if (!addresses.isEmpty()) {
                        // Prefer the default address; fall back to the first one
                        CustomerAddress addr = addresses.stream()
                                .filter(CustomerAddress::isDefault)
                                .findFirst()
                                .orElse(addresses.get(0));

                        String resolved = Stream.of(
                                        addr.getAddressLine1(),
                                        addr.getAddressLine2(),
                                        addr.getCity(),
                                        addr.getState() + " - " + addr.getZipCode()
                                )
                                .filter(s -> s != null && !s.isBlank())
                                .collect(Collectors.joining(", "));

                        shipment.setShippingAddress(resolved);
                        // Persist the resolved address so future fetches are instant.
                        // Only reset to CREATED if the shipment is still in PENDING_ADDRESS state —
                        // never downgrade a shipment that has already progressed (PACKED, SHIPPED, etc.)
                        if ("PENDING_ADDRESS".equals(shipment.getStatus())) {
                            shipment.setStatus("CREATED");
                        }
                        shipmentRepository.save(shipment);
                        log.info("✅ Resolved address for PENDING_ADDRESS shipment {}: {}", shipment.getOrderNumber(), resolved);
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Could not resolve address for shipment {}: {}", shipment.getOrderNumber(), e.getMessage());
                }
            }
        });

        return shipments;
    }

    @Override
    @Transactional
    public CustomerAddress saveCustomerAddress(CustomerAddress address) {
        try {
            // Check if customer already has an address
            Optional<CustomerAddress> existingAddress = customerAddressRepository.findByCustomerId(address.getCustomerId())
                    .stream().findFirst();
            
            if (existingAddress.isPresent()) {
                // Update existing address
                CustomerAddress existing = existingAddress.get();
                existing.setAddressLine1(address.getAddressLine1());
                existing.setAddressLine2(address.getAddressLine2());
                existing.setCity(address.getCity());
                existing.setState(address.getState());
                existing.setZipCode(address.getZipCode());
                existing.setCountry(address.getCountry());
                existing.setContactPhone(address.getContactPhone());
                existing.setDefault(address.isDefault());
                
                CustomerAddress saved = customerAddressRepository.save(existing);
                log.info("✅ Updated existing address for customer: {} - Address ID: {}", address.getCustomerId(), saved.getId());
                return saved;
            } else {
                // Create new address
                address.setCreatedAt(LocalDateTime.now());
                CustomerAddress saved = customerAddressRepository.save(address);
                log.info("✅ Created new address for customer: {} - Address ID: {}", address.getCustomerId(), saved.getId());
                return saved;
            }
        } catch (Exception e) {
            log.error("❌ Failed to save customer address for customer: {}", address.getCustomerId(), e);
            throw new RuntimeException("Failed to save customer address: " + e.getMessage(), e);
        }
    }
    
    @Override
    public List<CustomerAddress> getCustomerAddresses(Long customerId) {
        return customerAddressRepository.findByCustomerId(customerId);
    }
    
    @Override
    public List<CustomerAddress> getAllCustomerAddresses() {
        return customerAddressRepository.findAll();
    }
    
    @Override
    @Transactional
    public CustomerAddress updateCustomerAddress(Long addressId, CustomerAddress address) {
        try {
            CustomerAddress existingAddress = customerAddressRepository.findById(addressId)
                    .orElseThrow(() -> new RuntimeException("Address not found with ID: " + addressId));
            
            existingAddress.setAddressLine1(address.getAddressLine1());
            existingAddress.setAddressLine2(address.getAddressLine2());
            existingAddress.setCity(address.getCity());
            existingAddress.setState(address.getState());
            existingAddress.setZipCode(address.getZipCode());
            existingAddress.setCountry(address.getCountry());
            existingAddress.setContactPhone(address.getContactPhone());
            
            CustomerAddress saved = customerAddressRepository.save(existingAddress);
            log.info("✅ Updated address ID: {} for customer: {}", addressId, existingAddress.getCustomerId());
            return saved;
        } catch (Exception e) {
            log.error("❌ Failed to update address ID: {}", addressId, e);
            throw new RuntimeException("Failed to update address: " + e.getMessage(), e);
        }
    }
    
    @Override
    @Transactional
    public void deleteCustomerAddress(Long addressId) {
        try {
            CustomerAddress address = customerAddressRepository.findById(addressId)
                    .orElseThrow(() -> new RuntimeException("Address not found with ID: " + addressId));
            
            customerAddressRepository.deleteById(addressId);
            log.info("✅ Deleted address ID: {} for customer: {}", addressId, address.getCustomerId());
        } catch (Exception e) {
            log.error("❌ Failed to delete address ID: {}", addressId, e);
            throw new RuntimeException("Failed to delete address: " + e.getMessage(), e);
        }
    }
    
    @Override
    @Transactional
    public CustomerAddress setDefaultAddress(Long customerId, Long addressId) {
        try {
            // First, unset all default addresses for this customer
            List<CustomerAddress> customerAddresses = customerAddressRepository.findByCustomerId(customerId);
            customerAddresses.forEach(addr -> {
                addr.setDefault(false);
                customerAddressRepository.save(addr);
            });
            
            // Then set the specified address as default
            CustomerAddress address = customerAddressRepository.findById(addressId)
                    .orElseThrow(() -> new RuntimeException("Address not found with ID: " + addressId));
            
            if (!address.getCustomerId().equals(customerId)) {
                throw new RuntimeException("Address does not belong to customer: " + customerId);
            }
            
            address.setDefault(true);
            CustomerAddress saved = customerAddressRepository.save(address);
            log.info("✅ Set address ID: {} as default for customer: {}", addressId, customerId);
            return saved;
        } catch (Exception e) {
            log.error("❌ Failed to set default address ID: {} for customer: {}", addressId, customerId, e);
            throw new RuntimeException("Failed to set default address: " + e.getMessage(), e);
        }
    }
    
    @Override
    public Optional<CustomerAddress> getDefaultAddress(Long customerId) {
        CustomerAddress defaultAddress = customerAddressRepository.findByCustomerIdAndIsDefaultTrue(customerId);
        return Optional.ofNullable(defaultAddress);
    }

    // ── Package management ──────────────────────────────────────────────────

    @Override
    public List<Package> getAllPackages() {
        return packageRepository.findAll();
    }

    @Override
    public Optional<Package> getPackageByOrderNumber(String orderNumber) {
        return packageRepository.findByOrderNumber(orderNumber);
    }

    @Override
    @Transactional
    public Package updatePackage(String orderNumber, PackageRequest request) {
        Package pkg = packageRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new RuntimeException("Package not found for order: " + orderNumber));

        if (request.getWeightKg()          != null) pkg.setWeightKg(request.getWeightKg());
        if (request.getLengthCm()          != null) pkg.setLengthCm(request.getLengthCm());
        if (request.getWidthCm()           != null) pkg.setWidthCm(request.getWidthCm());
        if (request.getHeightCm()          != null) pkg.setHeightCm(request.getHeightCm());
        if (request.getPackingSlipNumber() != null) pkg.setPackingSlipNumber(request.getPackingSlipNumber());
        if (request.getPackedBy()          != null) pkg.setPackedBy(request.getPackedBy());
        if (request.getNotes()             != null) pkg.setNotes(request.getNotes());

        Package saved = packageRepository.save(pkg);
        log.info("✅ Package details updated for order: {}", orderNumber);
        return saved;
    }
}