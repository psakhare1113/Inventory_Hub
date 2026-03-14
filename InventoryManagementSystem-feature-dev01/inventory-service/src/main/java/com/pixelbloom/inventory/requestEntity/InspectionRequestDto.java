package com.pixelbloom.inventory.requestEntity;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InspectionRequestDto {
    private String orderNumber;
    @NotEmpty
    private String barcode;
}
