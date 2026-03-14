package com.pixelbloom.orders.model;

import com.pixelbloom.orders.enums.RefundStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RefundResponse {
        private String refundReference;
        private String orderNumber;
        private Long customerId;
        private RefundStatus refundStatus;
        private BigDecimal totalRefundAmount;
        private String currency;
        private LocalDateTime refundedAt;
        private String rejectionReason;
    }

