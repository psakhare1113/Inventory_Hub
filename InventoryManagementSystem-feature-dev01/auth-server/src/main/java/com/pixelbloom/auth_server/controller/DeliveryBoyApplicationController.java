package com.pixelbloom.auth_server.controller;

import com.pixelbloom.auth_server.dto.DeliveryBoy;
import com.pixelbloom.auth_server.enums.CustomerStatus;
import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.model.DeliveryBoyApplication;
import com.pixelbloom.auth_server.model.DeliveryBoyApplication.ApplicationStatus;
import com.pixelbloom.auth_server.repository.CustomerRepository;
import com.pixelbloom.auth_server.repository.DeliveryBoyApplicationRepository;
import com.pixelbloom.auth_server.repository.DeliveryBoyRepository;
import com.pixelbloom.auth_server.service.AuthService;
import com.pixelbloom.auth_server.service.DeliveryBoyApplicationEmailService;
import com.pixelbloom.auth_server.service.OtpEmailService;
import com.pixelbloom.auth_server.utils.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Delivery Boy Self-Registration & Admin Approval Flow.
 *
 * Public:
 *   POST /api/auth/delivery/apply          → Submit application
 *   GET  /api/auth/delivery/application/status?email=  → Check own status
 *
 * Admin:
 *   GET  /api/auth/admin/delivery/applications          → All applications
 *   GET  /api/auth/admin/delivery/applications/pending  → Pending only
 *   POST /api/auth/admin/delivery/applications/{id}/approve → Approve
 *   POST /api/auth/admin/delivery/applications/{id}/reject  → Reject
 *   GET  /api/auth/admin/delivery/applications/stats    → Counts
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class DeliveryBoyApplicationController {

    private final DeliveryBoyApplicationRepository applicationRepository;
    private final CustomerRepository customerRepository;
    private final DeliveryBoyRepository deliveryBoyRepository;
    private final AuthService authService;
    private final DeliveryBoyApplicationEmailService emailService;
    private final OtpEmailService otpEmailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC — Submit Application
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/delivery/apply
     * Delivery boy submits registration application.
     * No auth required — public endpoint.
     */
    @PostMapping("/api/auth/delivery/apply")
    public ResponseEntity<?> submitApplication(@RequestBody Map<String, Object> body) {
        try {
            String email = (String) body.get("email");
            String firstName = (String) body.getOrDefault("firstName", "");
            String lastName  = (String) body.getOrDefault("lastName", "");
            String phone     = (String) body.getOrDefault("phoneNumber", "");
            String password  = (String) body.get("password");

            if (email == null || email.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
            if (password == null || password.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));

            // Check duplicate application
            if (applicationRepository.existsByEmail(email)) {
                DeliveryBoyApplication existing = applicationRepository.findByEmail(email).get();
                if (existing.getStatus() == ApplicationStatus.PENDING || existing.getStatus() == ApplicationStatus.UNDER_REVIEW) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "error", "Application already submitted. Status: " + existing.getStatus(),
                        "status", existing.getStatus()
                    ));
                }
                if (existing.getStatus() == ApplicationStatus.APPROVED) {
                    return ResponseEntity.badRequest().body(Map.of(
                        "error", "You are already an approved delivery partner. Please login.",
                        "status", "APPROVED"
                    ));
                }
                // REJECTED — allow re-apply: delete old and create new
                applicationRepository.delete(existing);
            }

            // Check if already a delivery boy
            if (authService.isDeliveryBoyEmail(email)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "This email is already registered as a delivery partner.",
                    "status", "APPROVED"
                ));
            }

            // Build application
            DeliveryBoyApplication app = DeliveryBoyApplication.builder()
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .phoneNumber(phone)
                .password(passwordEncoder.encode(password))
                .city((String) body.getOrDefault("city", ""))
                .pincode((String) body.getOrDefault("pincode", ""))
                .address((String) body.getOrDefault("address", ""))
                .vehicleType((String) body.getOrDefault("vehicleType", "BIKE"))
                .vehicleNumber((String) body.getOrDefault("vehicleNumber", ""))
                .vehicleModel((String) body.getOrDefault("vehicleModel", ""))
                .aadharNumber((String) body.getOrDefault("aadharNumber", ""))
                .drivingLicense((String) body.getOrDefault("drivingLicense", ""))
                .panNumber((String) body.getOrDefault("panNumber", ""))
                .aadharImageUrl((String) body.getOrDefault("aadharImageUrl", ""))
                .licenseImageUrl((String) body.getOrDefault("licenseImageUrl", ""))
                .vehicleRcUrl((String) body.getOrDefault("vehicleRcUrl", ""))
                .selfieUrl((String) body.getOrDefault("selfieUrl", ""))
                .status(ApplicationStatus.PENDING)
                .build();

            applicationRepository.save(app);
            log.info("New delivery boy application from: {} {}", firstName, email);

            // Send confirmation email to applicant
            try {
                emailService.sendApplicationReceivedEmail(email, firstName);
            } catch (Exception e) {
                log.warn("Could not send confirmation email: {}", e.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                "message", "Application submitted successfully! We'll review and notify you within 24-48 hours.",
                "applicationId", app.getId(),
                "status", "PENDING"
            ));

        } catch (Exception e) {
            log.error("Application submission error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/auth/delivery/application/status?email=xxx
     * Applicant checks their own application status.
     */
    @GetMapping("/api/auth/delivery/application/status")
    public ResponseEntity<?> checkApplicationStatus(@RequestParam String email) {
        return applicationRepository.findByEmail(email)
            .map(app -> ResponseEntity.ok(Map.of(
                "status",       app.getStatus(),
                "appliedAt",    app.getAppliedAt(),
                "reviewedAt",   app.getReviewedAt() != null ? app.getReviewedAt() : "",
                "adminRemarks", app.getAdminRemarks() != null ? app.getAdminRemarks() : "",
                "firstName",    app.getFirstName()
            )))
            .orElse(ResponseEntity.ok(Map.of("status", "NOT_APPLIED")));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN — View & Manage Applications
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/auth/admin/delivery/applications
     * Admin sees all applications (all statuses).
     */
    @GetMapping("/api/auth/admin/delivery/applications")
    public ResponseEntity<?> getAllApplications() {
        List<DeliveryBoyApplication> apps = applicationRepository.findAllByOrderByAppliedAtDesc();
        return ResponseEntity.ok(apps.stream().map(this::toSafeMap).toList());
    }

    /**
     * GET /api/auth/admin/delivery/applications/pending
     * Admin sees only PENDING applications.
     */
    @GetMapping("/api/auth/admin/delivery/applications/pending")
    public ResponseEntity<?> getPendingApplications() {
        List<DeliveryBoyApplication> apps = applicationRepository
            .findByStatusOrderByAppliedAtDesc(ApplicationStatus.PENDING);
        return ResponseEntity.ok(apps.stream().map(this::toSafeMap).toList());
    }

    /**
     * GET /api/auth/admin/delivery/applications/stats
     * Admin dashboard stats.
     */
    @GetMapping("/api/auth/admin/delivery/applications/stats")
    public ResponseEntity<?> getApplicationStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total",       applicationRepository.count());
        stats.put("pending",     applicationRepository.countByStatus(ApplicationStatus.PENDING));
        stats.put("underReview", applicationRepository.countByStatus(ApplicationStatus.UNDER_REVIEW));
        stats.put("approved",    applicationRepository.countByStatus(ApplicationStatus.APPROVED));
        stats.put("rejected",    applicationRepository.countByStatus(ApplicationStatus.REJECTED));
        return ResponseEntity.ok(stats);
    }

    /**
     * POST /api/auth/admin/delivery/applications/{id}/approve
     * Admin approves application → auto role assign → email sent.
     * Body: { "remarks": "Welcome aboard!" }
     */
    @PostMapping("/api/auth/admin/delivery/applications/{id}/approve")
    public ResponseEntity<?> approveApplication(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            DeliveryBoyApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found: " + id));

            if (app.getStatus() == ApplicationStatus.APPROVED) {
                return ResponseEntity.badRequest().body(Map.of("error", "Already approved"));
            }

            String remarks = body != null ? (String) body.getOrDefault("remarks", "Welcome to the team!") : "Welcome to the team!";

            // ── Step 1: Create Customer account if not exists ──────────────
            if (!customerRepository.existsByEmail(app.getEmail())) {
                Customer customer = new Customer();
                customer.setEmail(app.getEmail());
                customer.setFirstName(app.getFirstName());
                customer.setLastName(app.getLastName());
                customer.setPhoneNumber(app.getPhoneNumber());
                customer.setPassword(app.getPassword()); // already hashed
                customer.setStatus(CustomerStatus.ACTIVE);
                customer.setEmailVerified(true);
                customer.setCreatedAt(LocalDateTime.now());
                customer.setUpdatedAt(LocalDateTime.now());
                customerRepository.save(customer);
                log.info("Customer account created for delivery boy: {}", app.getEmail());
            } else {
                // Activate existing account
                Customer existing = customerRepository.findByEmail(app.getEmail()).get();
                existing.setStatus(CustomerStatus.ACTIVE);
                existing.setEmailVerified(true);
                existing.setUpdatedAt(LocalDateTime.now());
                customerRepository.save(existing);
            }

            // ── Step 2: Add to delivery_boys table ─────────────────────────
            authService.addDeliveryBoy(app.getEmail());
            log.info("Delivery boy role assigned to: {}", app.getEmail());

            // ── Step 3: Update application status ─────────────────────────
            app.setStatus(ApplicationStatus.APPROVED);
            app.setAdminRemarks(remarks);
            app.setReviewedAt(LocalDateTime.now());
            if (token != null && token.startsWith("Bearer ")) {
                try {
                    // Store admin email as reviewer info in remarks
                    String adminEmail = jwtUtil.extractUsername(token.substring(7));
                    app.setAdminRemarks(remarks + " [Reviewed by: " + adminEmail + "]");
                } catch (Exception ignored) {}
            }
            applicationRepository.save(app);

            // ── Step 4: Send approval email ────────────────────────────────
            try {
                emailService.sendApprovedEmail(app.getEmail(), app.getFirstName());
                log.info("Approval email sent to: {}", app.getEmail());
            } catch (Exception e) {
                log.warn("Could not send approval email: {}", e.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                "message", "Application approved! " + app.getFirstName() + " is now a delivery partner.",
                "email",   app.getEmail(),
                "status",  "APPROVED"
            ));

        } catch (Exception e) {
            log.error("Approval error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/auth/admin/delivery/applications/{id}/reject
     * Admin rejects application → email sent with reason.
     * Body: { "reason": "Documents not clear" }
     */
    @PostMapping("/api/auth/admin/delivery/applications/{id}/reject")
    public ResponseEntity<?> rejectApplication(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            DeliveryBoyApplication app = applicationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Application not found: " + id));

            if (app.getStatus() == ApplicationStatus.APPROVED) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot reject an already approved application"));
            }

            String reason = body != null ? (String) body.getOrDefault("reason", "") : "";

            app.setStatus(ApplicationStatus.REJECTED);
            app.setAdminRemarks(reason);
            app.setReviewedAt(LocalDateTime.now());
            applicationRepository.save(app);

            // Send rejection email
            try {
                emailService.sendRejectedEmail(app.getEmail(), app.getFirstName(), reason);
                log.info("Rejection email sent to: {}", app.getEmail());
            } catch (Exception e) {
                log.warn("Could not send rejection email: {}", e.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                "message", "Application rejected. Email sent to " + app.getEmail(),
                "status",  "REJECTED"
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PATCH /api/auth/admin/delivery/applications/{id}/under-review
     * Admin marks application as under review.
     */
    @PatchMapping("/api/auth/admin/delivery/applications/{id}/under-review")
    public ResponseEntity<?> markUnderReview(@PathVariable Long id) {
        return applicationRepository.findById(id)
            .map(app -> {
                app.setStatus(ApplicationStatus.UNDER_REVIEW);
                applicationRepository.save(app);
                return ResponseEntity.ok(Map.of("message", "Marked as under review", "status", "UNDER_REVIEW"));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER — Safe map (no password)
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, Object> toSafeMap(DeliveryBoyApplication app) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",             app.getId());
        m.put("firstName",      app.getFirstName());
        m.put("lastName",       app.getLastName());
        m.put("email",          app.getEmail());
        m.put("phoneNumber",    app.getPhoneNumber());
        m.put("city",           app.getCity());
        m.put("pincode",        app.getPincode());
        m.put("address",        app.getAddress());
        m.put("vehicleType",    app.getVehicleType());
        m.put("vehicleNumber",  app.getVehicleNumber());
        m.put("vehicleModel",   app.getVehicleModel());
        m.put("aadharNumber",   app.getAadharNumber());
        m.put("drivingLicense", app.getDrivingLicense());
        m.put("panNumber",      app.getPanNumber());
        m.put("aadharImageUrl", app.getAadharImageUrl());
        m.put("licenseImageUrl",app.getLicenseImageUrl());
        m.put("vehicleRcUrl",   app.getVehicleRcUrl());
        m.put("selfieUrl",      app.getSelfieUrl());
        m.put("status",         app.getStatus());
        m.put("adminRemarks",   app.getAdminRemarks());
        m.put("appliedAt",      app.getAppliedAt());
        m.put("reviewedAt",     app.getReviewedAt());
        // NO password field
        return m;
    }
}
