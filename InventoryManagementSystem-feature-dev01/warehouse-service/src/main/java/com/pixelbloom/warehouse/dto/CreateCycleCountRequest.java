package com.pixelbloom.warehouse.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCycleCountRequest {

    @NotNull(message = "Warehouse ID is required")
    private Long warehouseId;

    private Long locationId; // Null for full warehouse count

    @NotNull(message = "Scheduled date is required")
    @FutureOrPresent(message = "Scheduled date must be today or in future")
    private LocalDate scheduledDate;

    @NotBlank(message = "Count type is required")
    private String countType; // FULL, LOCATION, PRODUCT, ABC_CLASS

    private String abcClass; // A, B, C (if countType = ABC_CLASS)

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;
}
