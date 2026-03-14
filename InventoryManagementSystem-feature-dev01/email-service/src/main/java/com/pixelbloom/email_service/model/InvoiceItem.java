package com.pixelbloom.email_service.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

  @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public class InvoiceItem {
        private String description;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal taxAmount;
        private BigDecimal lineTotal;
    }

