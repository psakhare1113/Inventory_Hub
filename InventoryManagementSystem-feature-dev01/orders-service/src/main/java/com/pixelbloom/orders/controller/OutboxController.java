package com.pixelbloom.orders.controller;

import com.pixelbloom.orders.model.OrderOutbox;
import com.pixelbloom.orders.service.OutboxService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OutboxController {

    private final OutboxService outboxService;

    public OutboxController(OutboxService outboxService) {
        this.outboxService = outboxService;
    }


    @GetMapping("/failedEvents")
    public ResponseEntity<List<OrderOutbox>> getFailedEvents() {
        return ResponseEntity.ok(outboxService.getFailedEvents());
    }

    @PostMapping("/resendFailedEvents")
    public ResponseEntity<String> resendFailedEvents() {
        outboxService.resendFailedEvents();
        return ResponseEntity.ok("Failed events resend initiated");
    }
}
