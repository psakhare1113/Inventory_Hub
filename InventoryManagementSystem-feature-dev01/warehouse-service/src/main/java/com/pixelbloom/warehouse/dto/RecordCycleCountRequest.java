package com.pixelbloom.warehouse.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecordCycleCountRequest {

    @NotNull(message = "Cycle count ID is required")
    private Long cycleCountId;

    @NotEmpty(message = "At least one count line is required")
    @Valid
    private List<CountLineRequest> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CountLineRequest {

        @NotNull(message = "Product ID is required")
        private Long productId;

        @NotNull(message = "Location ID is required")
        private Long locationId;

        private String barcode;

        @NotNull(message = "System quantity is required")
        @Min(value = 0, message = "System quantity cannot be negative")
        private Integer systemQty;

        @NotNull(message = "Physical quantity is required")
        @Min(value = 0, message = "Physical quantity cannot be negative")
        private Integer physicalQty;

        private String varianceReason;
        private String notes;
    }
}
