package com.pixelbloom.warehouse.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateGRNRequest {

    @NotNull(message = "PO ID is required")
    private Long poId;

    @NotNull(message = "Warehouse ID is required")
    private Long warehouseId;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;

    @NotEmpty(message = "At least one line item is required")
    @Valid
    private List<GRNLineRequest> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GRNLineRequest {

        @NotNull(message = "PO Line ID is required")
        private Long poLineId;

        @NotNull(message = "Product ID is required")
        private Long productId;

        @NotNull(message = "Quantity received is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer qtyReceived;

        @NotNull(message = "Quantity accepted is required")
        @Min(value = 0, message = "Quantity accepted cannot be negative")
        private Integer qtyAccepted;

        @NotNull(message = "Quantity rejected is required")
        @Min(value = 0, message = "Quantity rejected cannot be negative")
        private Integer qtyRejected;

        private String lotNumber;
        private String batchNumber;
        private LocalDate expirationDate;

        @NotBlank(message = "Condition is required")
        private String condition; // GOOD, DAMAGED, DEFECTIVE

        private String notes;
    }
}
