package com.pixelbloom.shipping.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO returned to checkout page with all courier options.
 * Frontend shows these options and customer picks one (or cheapest is auto-selected).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingRateResponse {

    /** Cheapest courier option (auto-selected by default) */
    private CourierOption recommended;

    /** All available courier options sorted by price */
    private List<CourierOption> allOptions;

    /** Zone info for display */
    private String zone;           // LOCAL | REGIONAL | NATIONAL
    private String zoneLabel;      // e.g. "Maharashtra (Regional)"

    /** Chargeable weight used for calculation (max of actual vs volumetric) */
    private Double chargeableWeightKg;
    private Double volumetricWeightKg;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourierOption {
        private String courier;           // Delhivery | BlueDart | Ekart | DTDC
        private double charge;            // ₹ shipping charge
        private int estimatedDays;        // delivery days
        private String deliverySpeed;     // STANDARD | EXPRESS | SAME_DAY
        private String speedLabel;        // "3-5 Days" | "1-2 Days" | "Same Day"
        private boolean codAvailable;     // COD support
        private double codCharge;         // extra COD handling charge (0 if prepaid)
    }
}
