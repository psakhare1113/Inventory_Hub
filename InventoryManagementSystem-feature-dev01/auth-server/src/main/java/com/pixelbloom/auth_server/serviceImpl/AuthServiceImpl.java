package com.pixelbloom.auth_server.serviceImpl;

import com.pixelbloom.auth_server.dto.Admin;
import com.pixelbloom.auth_server.dto.DeliveryBoy;
import com.pixelbloom.auth_server.dto.WarehouseStaff;
import com.pixelbloom.auth_server.enums.CustomerStatus;
import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.repository.AdminRepository;
import com.pixelbloom.auth_server.repository.CustomerRepository;
import com.pixelbloom.auth_server.repository.DeliveryBoyRepository;
import com.pixelbloom.auth_server.repository.WarehouseStaffRepository;
import com.pixelbloom.auth_server.service.AuthService;
import com.pixelbloom.auth_server.service.OtpEmailService;
import com.pixelbloom.auth_server.service.WarehouseStaffEmailService;
import com.pixelbloom.auth_server.utils.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuthServiceImpl implements AuthService {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AdminRepository adminRepository;
    private final DeliveryBoyRepository deliveryBoyRepository;
    private final OtpEmailService otpEmailService;
    private final WarehouseStaffRepository warehouseStaffRepository;
    private final WarehouseStaffEmailService warehouseStaffEmailService;

    public AuthServiceImpl(CustomerRepository customerRepository, PasswordEncoder passwordEncoder,
                           JwtUtil jwtUtil, AdminRepository adminRepository,
                           DeliveryBoyRepository deliveryBoyRepository, OtpEmailService otpEmailService,
                           WarehouseStaffRepository warehouseStaffRepository,
                           WarehouseStaffEmailService warehouseStaffEmailService) {
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.adminRepository = adminRepository;
        this.deliveryBoyRepository = deliveryBoyRepository;
        this.otpEmailService = otpEmailService;
        this.warehouseStaffRepository = warehouseStaffRepository;
        this.warehouseStaffEmailService = warehouseStaffEmailService;
    }

    @Override
    public String registerCustomer(Customer customer) {
        if (customerRepository.existsByEmail(customer.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        String otp = generateOtp();

        customer.setPassword(passwordEncoder.encode(customer.getPassword()));
        customer.setStatus(CustomerStatus.INACTIVE);
        customer.setEmailVerified(false);
        customer.setOtp(otp);
        customer.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        customer.setCreatedAt(LocalDateTime.now());
        customer.setUpdatedAt(LocalDateTime.now());
        customerRepository.save(customer);

        System.out.println("=== OTP FOR " + customer.getEmail() + " : " + otp + " ===");
        try {
            otpEmailService.sendOtpEmail(customer.getEmail(), otp, customer.getFirstName());
        } catch (Exception e) {
            System.err.println("Email send failed: " + e.getMessage() + " - OTP is: " + otp);
        }

        return "OTP sent to " + customer.getEmail() + ". Please verify your email.";
    }

    @Override
    public String verifyOtp(String email, String otp) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (Boolean.TRUE.equals(customer.getEmailVerified())) {
            return "Email already verified";
        }

        if (customer.getOtp() == null || !customer.getOtp().equals(otp)) {
            throw new RuntimeException("Invalid OTP");
        }

        if (customer.getOtpExpiry() == null || LocalDateTime.now().isAfter(customer.getOtpExpiry())) {
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }

        customer.setEmailVerified(true);
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setOtp(null);
        customer.setOtpExpiry(null);
        customer.setUpdatedAt(LocalDateTime.now());
        customerRepository.save(customer);

        return "Email verified successfully. You can now login.";
    }

    @Override
    public String resendOtp(String email) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (Boolean.TRUE.equals(customer.getEmailVerified())) {
            throw new RuntimeException("Email already verified");
        }

        String otp = generateOtp();
        customer.setOtp(otp);
        customer.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        customer.setUpdatedAt(LocalDateTime.now());
        customerRepository.save(customer);

        System.out.println("=== RESEND OTP FOR " + email + " : " + otp + " ===");
        try {
            otpEmailService.sendOtpEmail(customer.getEmail(), otp, customer.getFirstName());
        } catch (Exception e) {
            System.err.println("Resend email failed: " + e.getMessage() + " - OTP is: " + otp);
        }
        return "New OTP sent to " + email;
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    @Override
    public void validateToken(String token) {
        jwtUtil.validateToken(token);
    }

    @Override
    @Transactional
    public String createAdmin(String email) {
        if (adminRepository.existsByEmail(email)) {
            return "Already an admin";
        }
        Customer customer = customerRepository.findByEmail(email).orElse(null);
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setPassword(customer != null && customer.getPassword() != null
                ? customer.getPassword()
                : passwordEncoder.encode("admin-placeholder"));
        admin.setCreatedAt(LocalDateTime.now());
        adminRepository.save(admin);
        return "Admin email added successfully";
    }

    @Override
    public List<String> getAllAdminEmails() {
        return adminRepository.findAll().stream().map(Admin::getEmail).toList();
    }

    @Override
    public boolean isAdminEmail(String email) {
        return adminRepository.existsByEmail(email);
    }

    @Override
    @Transactional
    public String ensureAdmin(String email) {
        if (adminRepository.existsByEmail(email)) {
            return "Already an admin";
        }
        Admin admin = new Admin();
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode("admin-placeholder"));
        admin.setCreatedAt(LocalDateTime.now());
        adminRepository.save(admin);
        return "Admin ensured successfully";
    }

    @Override
    @Transactional
    public String deleteAdmin(String email) {
        if (!adminRepository.existsByEmail(email)) {
            throw new RuntimeException("Admin email not found");
        }
        adminRepository.deleteByEmail(email);
        return "Admin email removed successfully";
    }

    // ── Delivery Boy management ──────────────────────────────────────────────

    @Override
    @Transactional
    public String addDeliveryBoy(String email) {
        if (deliveryBoyRepository.existsByEmail(email)) {
            return "Already a delivery boy";
        }
        if (adminRepository.existsByEmail(email)) {
            adminRepository.deleteByEmail(email);
        }
        Customer customer = customerRepository.findByEmail(email).orElse(null);
        DeliveryBoy db = new DeliveryBoy();
        db.setEmail(email);
        db.setPassword(customer != null && customer.getPassword() != null
                ? customer.getPassword()
                : passwordEncoder.encode("db-placeholder"));
        db.setCreatedAt(LocalDateTime.now());
        deliveryBoyRepository.save(db);
        return "Delivery boy added successfully";
    }

    @Override
    public boolean isDeliveryBoyEmail(String email) {
        return deliveryBoyRepository.existsByEmail(email);
    }

    @Override
    @Transactional
    public String removeDeliveryBoy(String email) {
        if (!deliveryBoyRepository.existsByEmail(email)) {
            throw new RuntimeException("Delivery boy not found");
        }
        deliveryBoyRepository.deleteByEmail(email);
        return "Delivery boy removed successfully";
    }

    @Override
    public List<String> getAllDeliveryBoyEmails() {
        return deliveryBoyRepository.findAll().stream().map(DeliveryBoy::getEmail).toList();
    }

    // ── Warehouse Staff management ───────────────────────────────────────────

    @Override
    @Transactional
    public String addWarehouseStaff(String email, String role) {
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found with email: " + email));

        if (warehouseStaffRepository.existsByEmail(email)) {
            // Update role if already exists
            WarehouseStaff existing = warehouseStaffRepository.findByEmail(email).get();
            existing.setRole(role);
            warehouseStaffRepository.save(existing);
            return "Warehouse staff role updated to " + role;
        }

        WarehouseStaff staff = new WarehouseStaff();
        staff.setEmail(email);
        staff.setPassword(customer.getPassword());
        staff.setRole(role);
        staff.setFirstName(customer.getFirstName());
        staff.setLastName(customer.getLastName());
        staff.setCreatedAt(LocalDateTime.now());
        warehouseStaffRepository.save(staff);
        return "Warehouse staff added with role: " + role;
    }

    @Override
    public boolean isWarehouseStaffEmail(String email) {
        return warehouseStaffRepository.existsByEmail(email);
    }

    @Override
    public String getWarehouseStaffRole(String email) {
        return warehouseStaffRepository.findByEmail(email)
                .map(WarehouseStaff::getRole)
                .orElse(null);
    }

    @Override
    @Transactional
    public String removeWarehouseStaff(String email) {
        if (!warehouseStaffRepository.existsByEmail(email)) {
            throw new RuntimeException("Warehouse staff not found");
        }
        warehouseStaffRepository.deleteByEmail(email);
        return "Warehouse staff removed successfully";
    }

    // ── Warehouse Manager → Staff Add (with credentials email) ──────────────

    @Override
    @Transactional
    public String addWarehouseStaffByManager(String firstName, String lastName, String email,
                                              String role, String customPassword) {
        // Email already exists check
        if (warehouseStaffRepository.existsByEmail(email)) {
            throw new RuntimeException("Staff with email '" + email + "' already exists");
        }

        // Valid roles check — Manager can only add non-manager roles
        String normalizedRole = role != null ? role.toUpperCase() : "";
        if (!isValidStaffRole(normalizedRole)) {
            throw new RuntimeException("Invalid role: " + role +
                ". Valid roles: RECEIVING, PICKER, PACKER, SHIPPING, AUDITOR, VIEWER");
        }

        // Generate password — use custom if provided, otherwise auto-generate
        String rawPassword = (customPassword != null && !customPassword.isBlank())
                ? customPassword
                : generateStaffPassword();

        // Save staff
        WarehouseStaff staff = new WarehouseStaff();
        staff.setEmail(email);
        staff.setPassword(passwordEncoder.encode(rawPassword));
        staff.setRole(normalizedRole);
        staff.setFirstName(firstName);
        staff.setLastName(lastName);
        staff.setCreatedAt(LocalDateTime.now());
        warehouseStaffRepository.save(staff);

        // Log to console (credentials will be visible even if email fails)
        System.out.println("=== NEW WAREHOUSE STAFF ADDED ===");
        System.out.println("Email: " + email);
        System.out.println("Password: " + rawPassword);
        System.out.println("Role: " + normalizedRole);
        System.out.println("=================================");

        // Send credentials email
        try {
            warehouseStaffEmailService.sendStaffCredentials(email, firstName, normalizedRole, rawPassword);
        } catch (Exception e) {
            System.err.println("Email send failed for " + email + ": " + e.getMessage());
            // Staff is added even if email fails
        }

        return "Staff added successfully. Credentials sent to " + email;
    }

    /**
     * Valid warehouse staff roles — WAREHOUSE_MANAGER cannot be added
     * (Manager is added only by Admin)
     */
    private boolean isValidStaffRole(String role) {
        return switch (role) {
            case "RECEIVING", "PICKER", "PACKER", "SHIPPING", "AUDITOR", "VIEWER" -> true;
            default -> false;
        };
    }

    /**
     * Auto-generate strong password: e.g. WH@2026#xK9m
     */
    private String generateStaffPassword() {
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghjkmnpqrstuvwxyz";
        String digits = "23456789";
        String special = "@#$!";
        String all = upper + lower + digits + special;

        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        sb.append("WH");
        sb.append(upper.charAt(random.nextInt(upper.length())));
        sb.append(lower.charAt(random.nextInt(lower.length())));
        sb.append(digits.charAt(random.nextInt(digits.length())));
        sb.append(special.charAt(random.nextInt(special.length())));
        for (int i = 0; i < 4; i++) {
            sb.append(all.charAt(random.nextInt(all.length())));
        }
        return sb.toString();
    }
}
