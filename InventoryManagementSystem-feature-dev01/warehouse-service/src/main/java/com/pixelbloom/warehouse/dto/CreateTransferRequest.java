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
public class CreateTransferRequest {

    @NotNull(message = "Source warehouse ID is required")
    private Long sourceWarehouseId;

    private Long sourceLocationId;

    @NotNull(message = "Destination warehouse ID is required")
    private Long destinationWarehouseId;

    private Long destinationLocationId;

    @NotBlank(message = "Transfer type is required")
    private String transferType; // INTER_WAREHOUSE, INTRA_WAREHOUSE, LOCATION_TO_LOCATION

    @Size(max = 500, message = "Reason cannot exceed 500 characters")
    private String reason;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;

    @NotEmpty(message = "At least one line item is required")
    @Valid
    private List<TransferLineRequest> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransferLineRequest {

        @NotNull(message = "Product ID is required")
        private Long productId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer qtyTransferred;

        private String barcode;
        private String lotNumber;
        private String notes;
    }
}
