package com.pixelbloom.shipping.service;

import com.pixelbloom.shipping.dto.CustomerAddress;
import com.pixelbloom.shipping.dto.PackageRequest;
import com.pixelbloom.shipping.event.OrderCreatedEvent;
import com.pixelbloom.shipping.model.Package;
import com.pixelbloom.shipping.model.Shipment;

import java.util.List;
import java.util.Optional;

public interface ShippingService {
    void createShipment(OrderCreatedEvent event);
    void markPacked(String orderNumber, Long customerId);
    void markShipped(String orderNumber, String trackingNumber, String courierPartner, Double cost);
    void markDelivered(String orderNumber);
    void getAddress();
    List<Shipment> getAllShipments();

    // ── Package management ──────────────────────────────────────────────────
    List<Package> getAllPackages();
    Optional<Package> getPackageByOrderNumber(String orderNumber);
    Package updatePackage(String orderNumber, PackageRequest request);

    // ── Customer address management ─────────────────────────────────────────
    CustomerAddress saveCustomerAddress(CustomerAddress address);
    List<CustomerAddress> getCustomerAddresses(Long customerId);
    List<CustomerAddress> getAllCustomerAddresses();
    CustomerAddress updateCustomerAddress(Long addressId, CustomerAddress address);
    void deleteCustomerAddress(Long addressId);
    CustomerAddress setDefaultAddress(Long customerId, Long addressId);
    Optional<CustomerAddress> getDefaultAddress(Long customerId);
}
