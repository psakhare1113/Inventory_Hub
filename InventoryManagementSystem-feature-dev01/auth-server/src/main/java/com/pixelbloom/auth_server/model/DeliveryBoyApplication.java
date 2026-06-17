package com.pixelbloom.auth_server.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Delivery Boy Self-Registration Application.
 * Applicant fills form → Admin approves/rejects → Auto role assign + email sent.
 * Table: delivery_boy_applications
 */
@Entity
@Table(name = "delivery_boy_applications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryBoyApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Personal Info ─────────────────────────────────────────────────────────
    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(nullable = false)
    private String password; // hashed before save

    private String city;
    private String pincode;
    private String address;

    // ── Vehicle Info ──────────────────────────────────────────────────────────
    private String vehicleType;      // BIKE, SCOOTER, BICYCLE, CAR
    private String vehicleNumber;    // e.g. MH12AB1234
    private String vehicleModel;     // e.g. Honda Activa

    // ── Documents ─────────────────────────────────────────────────────────────
    private String aadharNumber;     // masked: XXXX-XXXX-1234
    private String drivingLicense;   // DL number
    private String panNumber;        // PAN card

    // Document URLs (uploaded to cloud/local storage)
    @Column(length = 500)
    private String aadharImageUrl;

    @Column(length = 500)
    private String licenseImageUrl;

    @Column(length = 500)
    private String vehicleRcUrl;

    @Column(length = 500)
    private String selfieUrl;

    // ── Application Status ────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status;

    private String adminRemarks;         // Admin's note on approval/rejection
    private Long reviewedByAdminId;      // Which admin reviewed
    private LocalDateTime reviewedAt;    // When reviewed

    // ── Timestamps ────────────────────────────────────────────────────────────
    private LocalDateTime appliedAt;
    private LocalDateTime updatedAt;

    public enum ApplicationStatus {
        PENDING,    // Waiting for admin review
        APPROVED,   // Admin approved → role assigned
        REJECTED,   // Admin rejected → email sent with reason
        UNDER_REVIEW // Admin is reviewing
    }

    @PrePersist
    void onCreate() {
        this.appliedAt  = LocalDateTime.now();
        this.updatedAt  = LocalDateTime.now();
        if (this.status == null) this.status = ApplicationStatus.PENDING;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
