package com.pixelbloom.shipping.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pixelbloom.shipping.dto.CustomerAddress;
import com.pixelbloom.shipping.dto.PackageRequest;
import com.pixelbloom.shipping.dto.ShippingRateRequest;
import com.pixelbloom.shipping.dto.ShippingRateResponse;
import com.pixelbloom.shipping.event.OrderCreatedEvent;
import com.pixelbloom.shipping.model.Package;
import com.pixelbloom.shipping.model.Shipment;
import com.pixelbloom.shipping.service.ShippingRateCalculator;
import com.pixelbloom.shipping.service.ShippingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
@Slf4j
public class ShippingController {
    private final ShippingService shippingService;
    private final ShippingRateCalculator shippingRateCalculator;

    // ── Shipping Rate Calculation ─────────────────────────────────────────

    /**
     * POST /api/shipping/calculate
     * Called from checkout page BEFORE order is placed.
     * Returns all courier options with charges.
     *
     * Request body:
     * {
     *   "deliveryPincode": "416416",
     *   "weightKg": 1.5,
     *   "deliverySpeed": "STANDARD",   // optional — omit to get all speeds
     *   "paymentMode": "ONLINE"        // or "CASH_ON_DELIVERY"
     * }
     */
    @PostMapping("/calculate")
    public ResponseEntity<ShippingRateResponse> calculateShipping(
            @RequestBody ShippingRateRequest request) {
        log.info("Shipping rate request: pincode={} weight={}kg speed={} mode={}",
                request.getDeliveryPincode(), request.getWeightKg(),
                request.getDeliverySpeed(), request.getPaymentMode());
        ShippingRateResponse response = shippingRateCalculator.calculate(request);
        log.info("Shipping rate response: recommended={} charge={}",
                response.getRecommended().getCourier(), response.getRecommended().getCharge());
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/shipping/calculate?pincode=416416&weightKg=1.5&paymentMode=ONLINE
     * Convenience GET endpoint for quick lookups from frontend.
     */
    @GetMapping("/calculate")
    public ResponseEntity<ShippingRateResponse> calculateShippingGet(
            @RequestParam String pincode,
            @RequestParam(defaultValue = "0.5") Double weightKg,
            @RequestParam(defaultValue = "ONLINE") String paymentMode,
            @RequestParam(required = false) String deliverySpeed) {
        ShippingRateRequest request = ShippingRateRequest.builder()
                .deliveryPincode(pincode)
                .weightKg(weightKg)
                .paymentMode(paymentMode)
                .deliverySpeed(deliverySpeed)
                .build();
        return ResponseEntity.ok(shippingRateCalculator.calculate(request));
    }

    @PostMapping("/deliver/{orderNumber}")
    public ResponseEntity<String> markDelivered(@PathVariable String orderNumber) {
        shippingService.markDelivered(orderNumber);
        return ResponseEntity.ok("Shipment marked as delivered");
    }

    @PostMapping("/pack/{orderNumber}")
    public ResponseEntity<String> markPacked(
            @PathVariable String orderNumber,
            @RequestParam(required = false) Long customerId) {
        shippingService.markPacked(orderNumber, customerId);
        return ResponseEntity.ok("Shipment marked as packed");
    }

    @PostMapping("/ship/{orderNumber}")
    public ResponseEntity<String> markShipped(
            @PathVariable String orderNumber,
            @RequestParam(defaultValue = "") String trackingNumber,
            @RequestParam(defaultValue = "") String courierPartner,
            @RequestParam(required = false) Double cost,
            @RequestBody(required = false) java.util.Map<String, Object> body) {
        // Accept cost from query param OR request body (ShippingDashboard sends it in body)
        Double resolvedCost = cost;
        String resolvedTracking = trackingNumber;
        String resolvedCourier = courierPartner;
        if (body != null) {
            if (resolvedCost == null && body.get("cost") != null) {
                resolvedCost = ((Number) body.get("cost")).doubleValue();
            }
            if (resolvedTracking.isBlank() && body.get("trackingNumber") != null) {
                resolvedTracking = body.get("trackingNumber").toString();
            }
            if (resolvedTracking.isBlank() && body.get("awbNumber") != null) {
                resolvedTracking = body.get("awbNumber").toString();
            }
            if (resolvedCourier.isBlank() && body.get("carrier") != null) {
                resolvedCourier = body.get("carrier").toString();
            }
            if (resolvedCourier.isBlank() && body.get("courierPartner") != null) {
                resolvedCourier = body.get("courierPartner").toString();
            }
        }
        shippingService.markShipped(orderNumber, resolvedTracking, resolvedCourier, resolvedCost);
        return ResponseEntity.ok("Shipment marked as shipped");
    }

    @GetMapping("/shipments")
    public ResponseEntity<List<Shipment>> getAllShipments() {
        return ResponseEntity.ok(shippingService.getAllShipments());
    }

    @PostMapping("/test/create-shipment")
    public ResponseEntity<String> testCreateShipment(@RequestBody OrderCreatedEvent event) {
        shippingService.createShipment(event);
        return ResponseEntity.ok("Shipment creation triggered for order: " + event.getOrderNumber());
    }

    @GetMapping("/test/getAddress")
    public ResponseEntity<String> testGetAddress() {
        shippingService.getAddress();
        return ResponseEntity.ok("Customer address fetched");
    }
    
    @PostMapping("/addresses")
    public ResponseEntity<?> saveCustomerAddress(@RequestBody CustomerAddress address) {
        try {
            log.info("Received address save request: {}", address);
            CustomerAddress savedAddress = shippingService.saveCustomerAddress(address);
            log.info("Successfully saved address: {}", savedAddress);
            return ResponseEntity.ok(savedAddress);
        } catch (Exception e) {
            log.error("Error saving customer address: ", e);
            return ResponseEntity.badRequest().body("Error saving address: " + e.getMessage());
        }
    }
    
    @GetMapping("/test/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("Shipping service is running!");
    }

    // ── Package endpoints ─────────────────────────────────────────────────

    /**
     * GET /api/shipping/packages
     * Returns all package records stored in the packages table.
     */
    @GetMapping("/packages")
    public ResponseEntity<List<Package>> getAllPackages() {
        return ResponseEntity.ok(shippingService.getAllPackages());
    }

    /**
     * GET /api/shipping/packages/{orderNumber}
     * Returns the package record for a specific order.
     */
    @GetMapping("/packages/{orderNumber}")
    public ResponseEntity<?> getPackageByOrderNumber(@PathVariable String orderNumber) {
        return shippingService.getPackageByOrderNumber(orderNumber)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH /api/shipping/packages/{orderNumber}
     * Update package details (weight, dimensions, packing slip, notes, etc.)
     */
    @PatchMapping("/packages/{orderNumber}")
    public ResponseEntity<?> updatePackage(
            @PathVariable String orderNumber,
            @RequestBody PackageRequest request) {
        try {
            Package updated = shippingService.updatePackage(orderNumber, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            log.error("Error updating package for order {}: {}", orderNumber, e.getMessage());
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
    
    @PostMapping("/addresses/test")
    public ResponseEntity<?> testSaveAddress() {
        try {
            CustomerAddress testAddress = CustomerAddress.builder()
                    .customerId(1L)
                    .addressLine1("Test Address")
                    .city("Test City")
                    .state("Test State")
                    .zipCode("12345")
                    .country("India")
                    .contactPhone("1234567890")
                    .isDefault(true)
                    .build();
            
            CustomerAddress savedAddress = shippingService.saveCustomerAddress(testAddress);
            return ResponseEntity.ok(savedAddress);
        } catch (Exception e) {
            log.error("Error in test save: ", e);
            return ResponseEntity.badRequest().body("Test save failed: " + e.getMessage());
        }
    }
    
    @GetMapping("/addresses/{customerId}")
    public ResponseEntity<List<CustomerAddress>> getCustomerAddresses(@PathVariable Long customerId) {
        List<CustomerAddress> addresses = shippingService.getCustomerAddresses(customerId);
        return ResponseEntity.ok(addresses);
    }
    
    @GetMapping("/addresses")
    public ResponseEntity<List<CustomerAddress>> getAllCustomerAddresses() {
        List<CustomerAddress> addresses = shippingService.getAllCustomerAddresses();
        return ResponseEntity.ok(addresses);
    }
    
    @PutMapping("/addresses/{addressId}")
    public ResponseEntity<?> updateCustomerAddress(@PathVariable Long addressId, @RequestBody CustomerAddress address) {
        try {
            CustomerAddress updatedAddress = shippingService.updateCustomerAddress(addressId, address);
            return ResponseEntity.ok(updatedAddress);
        } catch (Exception e) {
            log.error("Error updating address: ", e);
            return ResponseEntity.badRequest().body("Error updating address: " + e.getMessage());
        }
    }
    
    @DeleteMapping("/addresses/{addressId}")
    public ResponseEntity<?> deleteCustomerAddress(@PathVariable Long addressId) {
        try {
            shippingService.deleteCustomerAddress(addressId);
            return ResponseEntity.ok("Address deleted successfully");
        } catch (Exception e) {
            log.error("Error deleting address: ", e);
            return ResponseEntity.badRequest().body("Error deleting address: " + e.getMessage());
        }
    }
    
    @PutMapping("/addresses/{customerId}/default/{addressId}")
    public ResponseEntity<?> setDefaultAddress(@PathVariable Long customerId, @PathVariable Long addressId) {
        try {
            CustomerAddress defaultAddress = shippingService.setDefaultAddress(customerId, addressId);
            return ResponseEntity.ok(defaultAddress);
        } catch (Exception e) {
            log.error("Error setting default address: ", e);
            return ResponseEntity.badRequest().body("Error setting default address: " + e.getMessage());
        }
    }
    
    @GetMapping("/addresses/{customerId}/default")
    public ResponseEntity<?> getDefaultAddress(@PathVariable Long customerId) {
        try {
            return shippingService.getDefaultAddress(customerId)
                    .map(address -> ResponseEntity.ok(address))
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error getting default address: ", e);
            return ResponseEntity.badRequest().body("Error getting default address: " + e.getMessage());
        }
    }
}
