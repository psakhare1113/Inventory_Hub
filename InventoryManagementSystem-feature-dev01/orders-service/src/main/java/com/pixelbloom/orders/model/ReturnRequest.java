package com.pixelbloom.orders.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRequest {

    private String orderNumber;
    private String barcode;
    private LocalDateTime returnInitiatedAt;
    private String returnReason;
    private Boolean damageDeclared;
    private String damageReason;
    private List<String> images;



}

