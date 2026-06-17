package com.pixelbloom.warehouse.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;

/**
 * HTTP client to fetch Supplier details from products-service.
 * products-service has Eureka disabled (eureka.client.enabled=false),
 * so we call it directly by URL instead of using Feign service-discovery.
 */
@Component
public class SupplierClient {

    private final RestTemplate restTemplate;
    private final String productsServiceUrl;

    public SupplierClient(RestTemplate restTemplate,
                          @Value("${products.service.url:http://localhost:9094}") String productsServiceUrl) {
        this.restTemplate = restTemplate;
        this.productsServiceUrl = productsServiceUrl;
    }

    /**
     * Fetch a single supplier by ID.
     * Returns null (gracefully) if products-service is unreachable.
     */
    public SupplierDto getSupplierById(Long supplierId) {
        try {
            String url = productsServiceUrl + "/api/auth/admin/suppliers/" + supplierId;
            SupplierDto dto = restTemplate.getForObject(url, SupplierDto.class);
            // trim whitespace/tab characters from string fields
            if (dto != null) {
                if (dto.getName()    != null) dto.setName(dto.getName().trim());
                if (dto.getPhone()   != null) dto.setPhone(dto.getPhone().trim());
                if (dto.getEmail()   != null) dto.setEmail(dto.getEmail().trim());
                if (dto.getCompany() != null) dto.setCompany(dto.getCompany().trim());
            }
            return dto;
        } catch (Exception e) {
            return null; // degrade gracefully — PO still works without supplier name
        }
    }

    // ── DTO matching Supplier entity in products-service ──────────────────────
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SupplierDto {
        private Long supplierId;
        private String name;
        private String email;
        private String phone;
        private String company;
        private String contactPerson;
        private String address;
        private String city;
        private String state;
        private String pincode;
        private String gstNumber;
        private String status;
        private String category;
        private Double rating;
        private Integer totalOrders;
        private Double totalPurchaseValue;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime lastOrderDate;
    }
}
