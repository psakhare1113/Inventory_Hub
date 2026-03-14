package com.pixelbloom.inventory.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor

public class SuccessResponseDTO {
    String orderNumber;
    String message;

    public SuccessResponseDTO(String orderNumber, String message) {
        this.orderNumber = orderNumber;
        this.message = message;
    }

}
