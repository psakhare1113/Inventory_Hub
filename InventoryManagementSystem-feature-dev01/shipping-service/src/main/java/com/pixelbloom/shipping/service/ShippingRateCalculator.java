package com.pixelbloom.shipping.service;

import com.pixelbloom.shipping.dto.ShippingRateRequest;
import com.pixelbloom.shipping.dto.ShippingRateResponse;
import com.pixelbloom.shipping.dto.ShippingRateResponse.CourierOption;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Calculates shipping charges based on:
 *  - Delivery zone (pincode → state → LOCAL / REGIONAL / NATIONAL)
 *  - Package weight (volumetric weight not used here — actual weight only)
 *  - Delivery speed (STANDARD / EXPRESS / SAME_DAY)
 *  - COD surcharge
 *
 * Real-world formula used by Delhivery / Ekart / BlueDart:
 *   Base charge (first 500g) + Per-kg slab × extra weight + Zone multiplier
 *
 * Zone logic (pincode prefix → state):
 *   LOCAL    = same state as warehouse (Maharashtra, prefix 4xx)
 *   REGIONAL = nearby states (Gujarat 3xx, Goa 4xx, MP 4xx, Rajasthan 3xx)
 *   NATIONAL = rest of India
 */
@Slf4j
@Service
public class ShippingRateCalculator {

    // ── Warehouse default pincode (Mumbai) ──────────────────────────────────
    private static final String WAREHOUSE_PINCODE = "400001";

    // ── Zone multipliers ────────────────────────────────────────────────────
    private static final double LOCAL_MULTIPLIER    = 1.0;
    private static final double REGIONAL_MULTIPLIER = 1.4;
    private static final double NATIONAL_MULTIPLIER = 1.9;

    // ── Speed multipliers ───────────────────────────────────────────────────
    private static final double STANDARD_MULTIPLIER = 1.0;
    private static final double EXPRESS_MULTIPLIER  = 1.6;
    private static final double SAME_DAY_MULTIPLIER = 2.5;

    // ── COD surcharge ───────────────────────────────────────────────────────
    private static final double COD_SURCHARGE = 40.0;

    /**
     * Main entry point — returns all courier options for the given request.
     */
    public ShippingRateResponse calculate(ShippingRateRequest request) {
        String deliveryPincode = request.getDeliveryPincode() != null
                ? request.getDeliveryPincode().trim() : "400001";
        String pickupPincode = request.getPickupPincode() != null
                ? request.getPickupPincode().trim() : WAREHOUSE_PINCODE;

        // Chargeable weight = max(actual weight, volumetric weight)
        // Volumetric weight = (L × W × H) / 5000  (courier industry standard — DIM factor 5000)
        double actualWeight = request.getWeightKg() != null && request.getWeightKg() > 0
                ? request.getWeightKg() : 0.5;

        double volumetricWeight = 0.0;
        if (request.getLengthCm() != null && request.getWidthCm() != null && request.getHeightCm() != null
                && request.getLengthCm() > 0 && request.getWidthCm() > 0 && request.getHeightCm() > 0) {
            volumetricWeight = (request.getLengthCm() * request.getWidthCm() * request.getHeightCm()) / 5000.0;
        }

        double weightKg = Math.max(actualWeight, volumetricWeight);
        log.info("Weight calc: actual={}kg volumetric={}kg chargeable={}kg",
                actualWeight, volumetricWeight, weightKg);

        boolean isCod = "CASH_ON_DELIVERY".equalsIgnoreCase(request.getPaymentMode());

        // Determine zone
        Zone zone = determineZone(pickupPincode, deliveryPincode);
        log.info("Shipping calc: pincode={} zone={} weight={}kg cod={}",
                deliveryPincode, zone, weightKg, isCod);

        // Build courier options for all speeds
        List<CourierOption> allOptions = new ArrayList<>();

        // ── Delhivery ──────────────────────────────────────────────────────
        allOptions.add(buildOption("Delhivery", weightKg, zone, "STANDARD", 3, 5, isCod, 42.0, 8.0));
        allOptions.add(buildOption("Delhivery", weightKg, zone, "EXPRESS",  1, 2, isCod, 42.0, 8.0));

        // ── Ekart (Flipkart logistics) ─────────────────────────────────────
        allOptions.add(buildOption("Ekart",     weightKg, zone, "STANDARD", 4, 6, isCod, 38.0, 7.0));
        allOptions.add(buildOption("Ekart",     weightKg, zone, "EXPRESS",  2, 3, isCod, 38.0, 7.0));

        // ── DTDC ───────────────────────────────────────────────────────────
        allOptions.add(buildOption("DTDC",      weightKg, zone, "STANDARD", 3, 5, isCod, 45.0, 9.0));

        // ── Blue Dart (premium — no COD for SAME_DAY) ─────────────────────
        allOptions.add(buildOption("Blue Dart", weightKg, zone, "EXPRESS",  1, 2, isCod, 65.0, 12.0));
        // SAME_DAY only for LOCAL zone
        if (zone == Zone.LOCAL) {
            allOptions.add(buildOption("Blue Dart", weightKg, zone, "SAME_DAY", 0, 0, false, 65.0, 12.0));
        }

        // Remove any nulls (safety check)
        allOptions.removeIf(o -> o == null);

        // Filter by requested speed (if specified)
        String requestedSpeed = request.getDeliverySpeed();
        List<CourierOption> filtered = (requestedSpeed != null && !requestedSpeed.isBlank())
                ? allOptions.stream()
                    .filter(o -> o.getDeliverySpeed().equalsIgnoreCase(requestedSpeed))
                    .toList()
                : allOptions;

        // Sort by charge ascending
        List<CourierOption> sorted = new ArrayList<>(filtered);
        sorted.sort(Comparator.comparingDouble(CourierOption::getCharge));

        CourierOption recommended = sorted.isEmpty() ? allOptions.get(0) : sorted.get(0);

        return ShippingRateResponse.builder()
                .recommended(recommended)
                .allOptions(sorted.isEmpty() ? allOptions : sorted)
                .zone(zone.name())
                .zoneLabel(zone.getLabel(deliveryPincode))
                .chargeableWeightKg(Math.round(weightKg * 100.0) / 100.0)
                .volumetricWeightKg(volumetricWeight > 0 ? Math.round(volumetricWeight * 100.0) / 100.0 : null)
                .build();
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    /**
     * Build a single CourierOption with calculated charge.
     *
     * Formula:
     *   baseCharge = baseRate (first 500g)
     *   extraWeight = max(0, weightKg - 0.5)
     *   weightCharge = ceil(extraWeight / 0.5) × perHalfKgRate
     *   zoneCharge = (baseCharge + weightCharge) × zoneMultiplier
     *   speedCharge = zoneCharge × speedMultiplier
     *   codCharge = isCod ? COD_SURCHARGE : 0
     *   total = round(speedCharge + codCharge)
     */
    private CourierOption buildOption(
            String courierName,
            double weightKg,
            Zone zone,
            String speed,
            int minDays,
            int maxDays,
            boolean isCod,
            double baseRate,       // charge for first 500g
            double perHalfKgRate   // charge per additional 500g slab
    ) {
        // Weight calculation
        double extraWeight = Math.max(0, weightKg - 0.5);
        int extraSlabs = (int) Math.ceil(extraWeight / 0.5);
        double weightCharge = baseRate + (extraSlabs * perHalfKgRate);

        // Zone multiplier
        double zoneMultiplier = switch (zone) {
            case LOCAL    -> LOCAL_MULTIPLIER;
            case REGIONAL -> REGIONAL_MULTIPLIER;
            case NATIONAL -> NATIONAL_MULTIPLIER;
        };

        // Speed multiplier
        double speedMultiplier = switch (speed.toUpperCase()) {
            case "EXPRESS"  -> EXPRESS_MULTIPLIER;
            case "SAME_DAY" -> SAME_DAY_MULTIPLIER;
            default         -> STANDARD_MULTIPLIER;
        };

        double charge = weightCharge * zoneMultiplier * speedMultiplier;
        double codCharge = isCod ? COD_SURCHARGE : 0.0;

        // Round to nearest ₹5 for clean display
        double finalCharge = Math.round(charge / 5.0) * 5.0;

        // Speed label
        String speedLabel = switch (speed.toUpperCase()) {
            case "EXPRESS"  -> minDays + "-" + maxDays + " Days (Express)";
            case "SAME_DAY" -> "Same Day Delivery";
            default         -> minDays + "-" + maxDays + " Days";
        };

        return CourierOption.builder()
                .courier(courierName)
                .charge(finalCharge)
                .estimatedDays(maxDays)
                .deliverySpeed(speed.toUpperCase())
                .speedLabel(speedLabel)
                .codAvailable(isCod)
                .codCharge(codCharge)
                .build();
    }

    /**
     * Determine delivery zone based on pincode prefix.
     *
     * India pincode zones:
     *   Maharashtra (warehouse state): 400xxx – 445xxx  → LOCAL
     *   Nearby states (Gujarat, Goa, MP, Rajasthan):    → REGIONAL
     *   Rest of India:                                   → NATIONAL
     */
    private Zone determineZone(String pickupPincode, String deliveryPincode) {
        if (deliveryPincode == null || deliveryPincode.length() < 3) return Zone.NATIONAL;

        int prefix3 = Integer.parseInt(deliveryPincode.substring(0, 3));

        // Maharashtra: 400–445
        if (prefix3 >= 400 && prefix3 <= 445) return Zone.LOCAL;

        // Regional states:
        //   Gujarat: 360–396
        //   Goa: 403
        //   Madhya Pradesh: 450–488
        //   Rajasthan: 301–342
        //   Chhattisgarh: 490–497
        if ((prefix3 >= 360 && prefix3 <= 396) ||
            (prefix3 == 403) ||
            (prefix3 >= 450 && prefix3 <= 488) ||
            (prefix3 >= 301 && prefix3 <= 342) ||
            (prefix3 >= 490 && prefix3 <= 497)) {
            return Zone.REGIONAL;
        }

        return Zone.NATIONAL;
    }

    // ── Zone enum ───────────────────────────────────────────────────────────
    public enum Zone {
        LOCAL, REGIONAL, NATIONAL;

        public String getLabel(String pincode) {
            return switch (this) {
                case LOCAL    -> "Maharashtra (Local)";
                case REGIONAL -> "Nearby State (Regional)";
                case NATIONAL -> "Pan India (National)";
            };
        }
    }
}
