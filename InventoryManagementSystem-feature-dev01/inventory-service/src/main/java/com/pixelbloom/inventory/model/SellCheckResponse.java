package com.pixelbloom.inventory.model;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SellCheckResponse {
    private List<SellItemResult> results;

    public Boolean isSellable() {
        return null;
    }
}