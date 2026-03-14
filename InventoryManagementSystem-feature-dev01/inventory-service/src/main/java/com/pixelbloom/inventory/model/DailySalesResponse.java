package com.pixelbloom.inventory.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class DailySalesResponse {
 //   @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate date;
    private BigDecimal totalSales;
    private BigDecimal totalCost;
    private BigDecimal totalProfit;

    public DailySalesResponse(LocalDate date, BigDecimal totalSales,BigDecimal totalCost,BigDecimal totalProfit) {
        this.date = date;
        this.totalSales = totalSales;
        this.totalCost = totalCost;
        this.totalProfit = totalProfit;
    }


}
