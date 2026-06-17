package com.pixelbloom.warehouse.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePurchaseOrderRequest {

    @NotNull(message = "Supplier ID is required")
    private Long supplierId;

    @NotNull(message = "Warehouse ID is required")
    private Long warehouseId;

    @NotNull(message = "Expected date is required")
    private LocalDate expectedDate;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;

    /**
     * Role of the person creating this PO.
     */
    @Size(max = 50)
    private String requestedByRole;

    /**
     * Credit Terms — NET_15, NET_30, NET_45, NET_60, IMMEDIATE
     */
    @Size(max = 20)
    private String creditTerms;

    /**
     * Ship To — warehouse address / name
     */
    @Size(max = 200)
    private String shipToAddress;

    /**
     * Receive Materials — will warehouse receive directly?
     */
    private Boolean receiveMaterials;

    /**
     * PO Date — official PO date (for backdated POs)
     */
    private LocalDate poDate;

    @Size(max = 500, message = "Terms and conditions cannot exceed 500 characters")
    private String termsAndConditions;

    @NotEmpty(message = "At least one line item is required")
    @Valid
    private List<POLineRequest> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class POLineRequest {

        @NotNull(message = "Product ID is required")
        private Long productId;

        @NotBlank(message = "Product name is required")
        private String productName;

        private String sku;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer qtyOrdered;

        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.01", message = "Unit price must be greater than 0")
        private BigDecimal unitPrice;

        private String notes;
    }
}
