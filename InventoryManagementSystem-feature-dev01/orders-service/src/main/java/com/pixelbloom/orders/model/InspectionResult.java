package com.pixelbloom.orders.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class InspectionResult {
    private final boolean eligible;
    private final String rejectionReason;

    private InspectionResult(boolean eligible, String rejectionReason) {
        this.eligible = eligible;
        this.rejectionReason = rejectionReason;
    }

    public static InspectionResult approved() {
        return new InspectionResult(true, null);
    }

    public static InspectionResult rejected(String reason) {
        return new InspectionResult(false, reason);
    }

    public boolean isEligible() { return eligible; }
    public String getRejectionReason() { return rejectionReason; }
}
