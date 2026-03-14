package com.pixelbloom.shipping.controller;

import com.pixelbloom.shipping.event.OrderCreatedEvent;
import com.pixelbloom.shipping.service.ShippingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class ShippingController {
    private final ShippingService shippingService;

    @PostMapping("/deliver/{orderNumber}")
    public ResponseEntity<String> markDelivered(@PathVariable String orderNumber) {
        shippingService.markDelivered(orderNumber);
        return ResponseEntity.ok("Shipment marked as delivered");
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

}
