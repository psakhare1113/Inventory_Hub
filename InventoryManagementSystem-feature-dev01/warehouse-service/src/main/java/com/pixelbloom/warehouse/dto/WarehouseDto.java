package com.pixelbloom.warehouse.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseDto {
    
    private Long id;
    private String code;
    private String name;
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String contactPerson;
    private String contactPhone;
    private String contactEmail;
    private BigDecimal capacitySqft;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
