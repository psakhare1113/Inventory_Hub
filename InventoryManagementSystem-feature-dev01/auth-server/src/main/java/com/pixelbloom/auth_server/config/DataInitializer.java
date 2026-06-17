package com.pixelbloom.auth_server.config;

import com.pixelbloom.auth_server.dto.WarehouseStaff;
import com.pixelbloom.auth_server.enums.CustomerStatus;
import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.repository.CustomerRepository;
import com.pixelbloom.auth_server.repository.WarehouseStaffRepository;
import com.pixelbloom.auth_server.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final AuthService authService;
    private final CustomerRepository customerRepository;
    private final WarehouseStaffRepository warehouseStaffRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.default-email}")
    private String defaultAdminEmail;

    // ── Seed users: email, password, firstName, lastName, role ───────────────
    private static final List<Map<String, String>> WAREHOUSE_SEED_USERS = List.of(
        Map.of("email", "wh.manager@pixelbloom.com",  "password", "Manager@123",  "firstName", "Warehouse", "lastName", "Manager",  "role", "WAREHOUSE_MANAGER"),
        Map.of("email", "receiving@pixelbloom.com",   "password", "Receive@123",  "firstName", "Receiving", "lastName", "Clerk",    "role", "RECEIVING"),
        Map.of("email", "picker@pixelbloom.com",      "password", "Picker@123",   "firstName", "Pick",      "lastName", "Staff",    "role", "PICKER"),
        Map.of("email", "packer@pixelbloom.com",      "password", "Packer@123",   "firstName", "Pack",      "lastName", "Staff",    "role", "PACKER"),
        Map.of("email", "shipping@pixelbloom.com",    "password", "Shipping@123", "firstName", "Shipping",  "lastName", "Staff",    "role", "SHIPPING"),
        Map.of("email", "auditor@pixelbloom.com",     "password", "Auditor@123",  "firstName", "Audit",     "lastName", "Staff",    "role", "AUDITOR"),
        Map.of("email", "viewer@pixelbloom.com",      "password", "Viewer@123",   "firstName", "View",      "lastName", "Staff",    "role", "VIEWER")
    );

    @Override
    public void run(ApplicationArguments args) {
        // 1. Seed default ADMIN
        try {
            if (!authService.isAdminEmail(defaultAdminEmail)) {
                authService.ensureAdmin(defaultAdminEmail);
                log.info("✅ Default admin seeded: {}", defaultAdminEmail);
            } else {
                log.info("✅ Default admin already exists: {}", defaultAdminEmail);
            }
        } catch (Exception e) {
            log.error("❌ Failed to seed default admin: {}", e.getMessage());
        }

        // 2. Seed warehouse staff users
        for (Map<String, String> u : WAREHOUSE_SEED_USERS) {
            String email    = u.get("email");
            String password = u.get("password");
            String role     = u.get("role");
            String firstName = u.get("firstName");
            String lastName  = u.get("lastName");

            try {
                // Step A: ensure customer record exists (needed for login)
                if (!customerRepository.existsByEmail(email)) {
                    Customer c = new Customer();
                    c.setEmail(email);
                    c.setPassword(passwordEncoder.encode(password));
                    c.setFirstName(firstName);
                    c.setLastName(lastName);
                    c.setStatus(CustomerStatus.ACTIVE);
                    c.setEmailVerified(true);
                    c.setCreatedAt(LocalDateTime.now());
                    c.setUpdatedAt(LocalDateTime.now());
                    customerRepository.save(c);
                    log.info("✅ Customer record created for: {}", email);
                }

                // Step B: ensure warehouse_staff record exists
                if (!warehouseStaffRepository.existsByEmail(email)) {
                    Customer c = customerRepository.findByEmail(email).orElseThrow();
                    WarehouseStaff staff = new WarehouseStaff();
                    staff.setEmail(email);
                    staff.setPassword(c.getPassword());
                    staff.setRole(role);
                    staff.setFirstName(firstName);
                    staff.setLastName(lastName);
                    staff.setCreatedAt(LocalDateTime.now());
                    warehouseStaffRepository.save(staff);
                    log.info("✅ Warehouse staff seeded: {} [{}]", email, role);
                } else {
                    log.info("✅ Warehouse staff already exists: {} [{}]", email, role);
                }
            } catch (Exception e) {
                log.error("❌ Failed to seed warehouse staff {}: {}", email, e.getMessage());
            }
        }

        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("📋 SEED CREDENTIALS SUMMARY");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("🔑 ADMIN          | {}  | (your account password)", defaultAdminEmail);
        log.info("🏭 WH_MANAGER     | wh.manager@pixelbloom.com  | Manager@123");
        log.info("📥 RECEIVING      | receiving@pixelbloom.com   | Receive@123");
        log.info("📦 PICKER         | picker@pixelbloom.com      | Picker@123");
        log.info("📫 PACKER         | packer@pixelbloom.com      | Packer@123");
        log.info("🚚 SHIPPING       | shipping@pixelbloom.com    | Shipping@123");
        log.info("🔍 AUDITOR        | auditor@pixelbloom.com     | Auditor@123");
        log.info("👁  VIEWER         | viewer@pixelbloom.com      | Viewer@123");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
}
