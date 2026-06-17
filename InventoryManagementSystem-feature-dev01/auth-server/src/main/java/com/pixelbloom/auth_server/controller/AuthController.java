package com.pixelbloom.auth_server.controller;

import com.pixelbloom.auth_server.dto.AuditStaff;
import com.pixelbloom.auth_server.dto.AddWarehouseStaffRequest;
import com.pixelbloom.auth_server.dto.AuthRequest;
import com.pixelbloom.auth_server.dto.LoginRequest;
import com.pixelbloom.auth_server.dto.PermissionRequest;
import com.pixelbloom.auth_server.enums.CustomerStatus;
import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.model.LoginAudit;
import com.pixelbloom.auth_server.model.Permission;
import com.pixelbloom.auth_server.model.RefreshToken;
import com.pixelbloom.auth_server.repository.AuditStaffRepository;
import com.pixelbloom.auth_server.repository.WarehouseStaffRepository;
import com.pixelbloom.auth_server.service.WarehouseStaffEmailService;
import com.pixelbloom.auth_server.service.AuthService;
import com.pixelbloom.auth_server.service.CustomerService;
import com.pixelbloom.auth_server.service.LoginAuditService;
import com.pixelbloom.auth_server.service.PermissionService;
import com.pixelbloom.auth_server.service.RefreshTokenService;
import com.pixelbloom.auth_server.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private AuthService authService;
    private CustomerService customerService;
    private JwtUtil jwtUtil;
    private AuthenticationManager authenticationManager;
    private PasswordEncoder passwordEncoder;
    private RefreshTokenService refreshTokenService;
    private LoginAuditService loginAuditService;
    private PermissionService permissionService;
    private WarehouseStaffRepository warehouseStaffRepository;
    private AuditStaffRepository auditStaffRepository;
    private WarehouseStaffEmailService warehouseStaffEmailService;



    public AuthController(AuthService authService, CustomerService customerService, AuthenticationManager authenticationManager, JwtUtil jwtUtil, PasswordEncoder passwordEncoder, RefreshTokenService refreshTokenService, LoginAuditService loginAuditService, PermissionService permissionService, WarehouseStaffRepository warehouseStaffRepository, AuditStaffRepository auditStaffRepository, WarehouseStaffEmailService warehouseStaffEmailService) {
        this.authService = authService;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.customerService = customerService;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
        this.loginAuditService = loginAuditService;
        this.permissionService = permissionService;
        this.warehouseStaffRepository = warehouseStaffRepository;
        this.auditStaffRepository = auditStaffRepository;
        this.warehouseStaffEmailService = warehouseStaffEmailService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> addNewUser(@RequestBody Customer user) {
        try {
            String result = authService.registerCustomer(user);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        try {
            String result = authService.verifyOtp(request.get("email"), request.get("otp"));
            return ResponseEntity.ok(Map.of("message", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> request) {
        try {
            String result = authService.resendOtp(request.get("email"));
            return ResponseEntity.ok(Map.of("message", result));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/token")
    public ResponseEntity<?> loginCustomer(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        try {
            // Search in customers table, if not found then search in warehouse_staff table
            Optional<Customer> customerOpt = customerService.findByEmail(request.getEmail());

            // Warehouse-only staff (customers table मध्ये नाहीत)
            if (customerOpt.isEmpty()) {
                // audit_staff table मध्ये आधी शोधा (AUDITOR / VIEWER)
                Optional<com.pixelbloom.auth_server.dto.AuditStaff> auditOpt =
                        auditStaffRepository.findByEmail(request.getEmail());
                if (auditOpt.isPresent()) {
                    com.pixelbloom.auth_server.dto.AuditStaff auditStaff = auditOpt.get();
                    Authentication authentication = authenticationManager.authenticate(
                            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
                    if (!authentication.isAuthenticated()) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(Map.of("error", "Invalid credentials"));
                    }
                    String role = auditStaff.getRole();
                    String token = jwtUtil.generateToken(auditStaff.getEmail(), auditStaff.getId(), role);
                    RefreshToken refreshToken = refreshTokenService.createRefreshToken(
                            auditStaff.getId(), auditStaff.getEmail(),
                            loginAuditService.extractDeviceInfo(httpRequest),
                            loginAuditService.getClientIpAddress(httpRequest));
                    Map<String, Object> auditResponse = new java.util.HashMap<>();
                    auditResponse.put("token", token);
                    auditResponse.put("refreshToken", refreshToken.getToken());
                    auditResponse.put("expiresIn", jwtUtil.getTokenValidity() / 1000);
                    auditResponse.put("isAdmin", false);
                    auditResponse.put("isDeliveryBoy", false);
                    auditResponse.put("role", role);
                    auditResponse.put("userRole", role);
                    auditResponse.put("customerId", auditStaff.getId());
                    auditResponse.put("id", auditStaff.getId());
                    auditResponse.put("firstName", auditStaff.getFirstName() != null ? auditStaff.getFirstName() : "");
                    auditResponse.put("lastName",  auditStaff.getLastName()  != null ? auditStaff.getLastName()  : "");
                    auditResponse.put("email", auditStaff.getEmail());
                    return ResponseEntity.ok(auditResponse);
                }

                boolean isWH = authService.isWarehouseStaffEmail(request.getEmail());
                if (!isWH) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("error", "Invalid credentials"));
                }
                // warehouse_staff table मधून authenticate करा
                com.pixelbloom.auth_server.dto.WarehouseStaff staff =
                        warehouseStaffRepository.findByEmail(request.getEmail())
                                .orElseThrow(() -> new RuntimeException("User not found"));

                Authentication authentication = authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

                if (!authentication.isAuthenticated()) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("error", "Invalid credentials"));
                }

                String role = staff.getRole();
                String token = jwtUtil.generateToken(staff.getEmail(), staff.getId(), role);
                RefreshToken refreshToken = refreshTokenService.createRefreshToken(
                        staff.getId(), staff.getEmail(),
                        loginAuditService.extractDeviceInfo(httpRequest),
                        loginAuditService.getClientIpAddress(httpRequest));

                return ResponseEntity.ok(Map.of(
                        "token", token,
                        "refreshToken", refreshToken.getToken(),
                        "expiresIn", jwtUtil.getTokenValidity() / 1000,
                        "isAdmin", false,
                        "isDeliveryBoy", false,
                        "role", role,
                        "userRole", role,
                        "customerId", staff.getId(),
                        "firstName", staff.getFirstName() != null ? staff.getFirstName() : "",
                        "lastName", staff.getLastName() != null ? staff.getLastName() : ""
                ));
            }

            Customer customer = customerOpt.get();

            // Check if account should be locked due to failed attempts
            if (loginAuditService.shouldLockAccount(request.getEmail())) {
                loginAuditService.logLoginAttempt(customer.getId(), request.getEmail(), "BLOCKED", 
                    "Too many failed attempts", "PASSWORD", httpRequest);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Account temporarily locked due to multiple failed login attempts. Please try again later."));
            }

            if (customer.getStatus() == CustomerStatus.BLOCKED) {
                loginAuditService.logLoginAttempt(customer.getId(), request.getEmail(), "BLOCKED", 
                    "Account is blocked", "PASSWORD", httpRequest);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Account is blocked"));
            }

            if (customer.getStatus() == CustomerStatus.PENDING || customer.getStatus() == CustomerStatus.INACTIVE || !Boolean.TRUE.equals(customer.getEmailVerified())) {
                loginAuditService.logLoginAttempt(customer.getId(), request.getEmail(), "FAILED", 
                    "Email not verified", "PASSWORD", httpRequest);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Email not verified. Please check your inbox for the OTP.", "emailNotVerified", true));
            }

            Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                            request.getEmail(),request.getPassword()));

            if (!authentication.isAuthenticated()) {
                loginAuditService.logLoginAttempt(customer.getId(), request.getEmail(), "FAILED", 
                    "Invalid credentials", "PASSWORD", httpRequest);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
            }

            boolean isAdmin = authService.isAdminEmail(customer.getEmail());
            boolean isDeliveryBoy = authService.isDeliveryBoyEmail(customer.getEmail());
            boolean isWarehouseStaff = authService.isWarehouseStaffEmail(customer.getEmail());
            String warehouseRole = isWarehouseStaff ? authService.getWarehouseStaffRole(customer.getEmail()) : null;
            String role = isAdmin ? "ADMIN"
                    : isDeliveryBoy ? "DELIVERY_BOY"
                    : isWarehouseStaff ? warehouseRole
                    : "USER";
            String token = jwtUtil.generateToken(customer.getEmail(), customer.getId(), role);
            
            // Create refresh token
            String deviceInfo = loginAuditService   .extractDeviceInfo(httpRequest);
            String ipAddress = loginAuditService.getClientIpAddress(httpRequest);
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(
                customer.getId(), customer.getEmail(), deviceInfo, ipAddress);
            
            // Log successful login
            loginAuditService.logLoginAttempt(customer.getId(), request.getEmail(), "SUCCESS", 
                null, "PASSWORD", httpRequest);

            return ResponseEntity.ok(Map.of(
                    "token", token,
                    "refreshToken", refreshToken.getToken(),
                    "expiresIn", jwtUtil.getTokenValidity() / 1000,
                    "isAdmin", isAdmin,
                    "isDeliveryBoy", isDeliveryBoy,
                    "role", role,
                    "userRole", role,
                    "customerId", customer.getId(),
                    "firstName", customer.getFirstName(),
                    "lastName", customer.getLastName()
            ));
        } catch (BadCredentialsException e) {
            // Log failed attempt
            Customer customer = customerService.findByEmail(request.getEmail()).orElse(null);
            Long customerId = customer != null ? customer.getId() : null;
            loginAuditService.logLoginAttempt(customerId, request.getEmail(), "FAILED", 
                "Invalid credentials", "PASSWORD", httpRequest);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Login failed: " + e.getMessage()));
        }
    }

    @GetMapping("/validate")
    public String validateToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.validateToken(token);
            return "Token is valid";
        }
        throw new SecurityException("No token provided");
    }

    @PostMapping("/createAdmin")
    public String createAdmin(@RequestParam String email,
                              @RequestHeader("Authorization") String token) {
        String userEmail = jwtUtil.extractUsername(token.substring(7));
        if (!authService.isAdminEmail(userEmail)) {
            throw new SecurityException("Access denied: Admin privileges required");
        }
        return authService.createAdmin(email);
    }


    @GetMapping("/isAdmin")
    public boolean checkIfAdmin(@RequestParam String email) {
        return authService.isAdminEmail(email);
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<?> getCustomer(@PathVariable Long customerId) {
        Optional<Customer> customer = customerService.findById(customerId);
        if (customer.isEmpty()) return ResponseEntity.notFound().build();
        Customer c = customer.get();
        return ResponseEntity.ok(java.util.Map.of(
            "id", c.getId(),
            "customerId", c.getId(),
            "firstName", c.getFirstName() != null ? c.getFirstName() : "",
            "lastName", c.getLastName() != null ? c.getLastName() : "",
            "email", c.getEmail() != null ? c.getEmail() : "",
            "customerEmail", c.getEmail() != null ? c.getEmail() : ""
        ));
    }

    @GetMapping("/user/profile")
    public ResponseEntity<?> getUserProfile(@RequestHeader("Authorization") String token) {
        String email = jwtUtil.extractUsername(token.substring(7));

        boolean isAdmin = authService.isAdminEmail(email);
        boolean isDeliveryBoy = authService.isDeliveryBoyEmail(email);
        boolean isWarehouseStaff = authService.isWarehouseStaffEmail(email);

        // audit_staff table check — AUDITOR / VIEWER
        Optional<com.pixelbloom.auth_server.dto.AuditStaff> auditOpt = auditStaffRepository.findByEmail(email);
        if (auditOpt.isPresent()) {
            com.pixelbloom.auth_server.dto.AuditStaff audit = auditOpt.get();
            return ResponseEntity.ok(Map.of(
                "id",          audit.getId(),
                "email",       audit.getEmail(),
                "firstName",   audit.getFirstName()  != null ? audit.getFirstName()  : "",
                "lastName",    audit.getLastName()   != null ? audit.getLastName()   : "",
                "isAdmin",     false,
                "isDeliveryBoy", false,
                "role",        audit.getRole(),
                "userRole",    audit.getRole()
            ));
        }

        String warehouseRole = isWarehouseStaff ? authService.getWarehouseStaffRole(email) : null;
        String resolvedRole = isAdmin ? "ADMIN"
                : isDeliveryBoy ? "DELIVERY_BOY"
                : isWarehouseStaff ? warehouseRole
                : "USER";

        // Warehouse staff जे फक्त warehouse_staff table मध्ये आहेत (customers table मध्ये नाहीत)
        if (isWarehouseStaff) {
            Optional<Customer> customerOpt = customerService.findByEmail(email);
            if (customerOpt.isEmpty()) {
                // warehouse_staff table मधून data घ्या
                com.pixelbloom.auth_server.dto.WarehouseStaff staff =
                    warehouseStaffRepository.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("Warehouse staff not found"));
                return ResponseEntity.ok(Map.of(
                    "id", staff.getId(),
                    "email", staff.getEmail(),
                    "firstName", staff.getFirstName() != null ? staff.getFirstName() : "",
                    "lastName", staff.getLastName() != null ? staff.getLastName() : "",
                    "isAdmin", false,
                    "isDeliveryBoy", false,
                    "role", resolvedRole,
                    "userRole", resolvedRole
                ));
            }
        }

        Customer customer = customerService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        return ResponseEntity.ok(Map.of(
            "id", customer.getId(),
            "email", customer.getEmail(),
            "firstName", customer.getFirstName() != null ? customer.getFirstName() : "",
            "lastName", customer.getLastName() != null ? customer.getLastName() : "",
            "isAdmin", isAdmin,
            "isDeliveryBoy", isDeliveryBoy,
            "role", resolvedRole,
            "userRole", resolvedRole
        ));
    }

    @GetMapping("/admin/customers")
    public ResponseEntity<?> getAllCustomers(@RequestHeader(value = "Authorization", required = false) String token) {
        List<Customer> customers = customerService.findAll();

        // Add role status to each customer
        List<Map<String, Object>> customersWithAdminStatus = customers.stream()
                .map(customer -> {
                    Map<String, Object> customerData = new java.util.HashMap<>();
                    customerData.put("id", customer.getId());
                    customerData.put("email", customer.getEmail() != null ? customer.getEmail() : "");
                    customerData.put("firstName", customer.getFirstName() != null ? customer.getFirstName() : "");
                    customerData.put("lastName", customer.getLastName() != null ? customer.getLastName() : "");
                    customerData.put("phoneNumber", customer.getPhoneNumber() != null ? customer.getPhoneNumber() : "");
                    customerData.put("status", customer.getStatus() != null ? customer.getStatus() : CustomerStatus.ACTIVE);

                    boolean isDB  = authService.isDeliveryBoyEmail(customer.getEmail());
                    boolean isAdm = !isDB && authService.isAdminEmail(customer.getEmail());
                    boolean isWH  = !isDB && !isAdm && authService.isWarehouseStaffEmail(customer.getEmail());
                    String whRole = isWH ? authService.getWarehouseStaffRole(customer.getEmail()) : null;

                    customerData.put("isAdmin", isAdm);
                    customerData.put("isDeliveryBoy", isDB);
                    customerData.put("isWarehouseStaff", isWH);
                    customerData.put("warehouseRole", whRole != null ? whRole : "");
                    // role field — frontend uses this directly
                    String role = isAdm ? "ADMIN"
                            : isDB  ? "DELIVERY_BOY"
                            : isWH  ? whRole
                            : "USER";
                    customerData.put("role", role != null ? role : "USER");
                    customerData.put("userRole", role != null ? role : "USER");
                    customerData.put("createdAt", customer.getCreatedAt());
                    customerData.put("updatedAt", customer.getUpdatedAt());
                    return customerData;
                })
                .toList();

        return ResponseEntity.ok(customersWithAdminStatus);
    }

    /**
     * Admin: सध्या active session असलेल्या सर्व customer IDs परत करतो
     * GET /api/auth/admin/active-sessions
     * Response: [ { "customerId": 1 }, { "customerId": 5 }, ... ]
     */
    @GetMapping("/admin/active-sessions")
    public ResponseEntity<?> getAdminActiveSessions(@RequestHeader(value = "Authorization", required = false) String token) {
        try {
            List<Long> activeIds = refreshTokenService.getAllActiveCustomerIds();
            List<Map<String, Object>> result = activeIds.stream()
                    .map(id -> {
                        Map<String, Object> m = new java.util.HashMap<>();
                        m.put("customerId", id);
                        return m;
                    })
                    .toList();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch active sessions"));
        }
    }

    @GetMapping("/admin/warehouse-staff")
    public ResponseEntity<?> getAllWarehouseStaff(@RequestHeader(value = "Authorization", required = false) String token) {
        List<com.pixelbloom.auth_server.dto.WarehouseStaff> staffList = warehouseStaffRepository.findAll();
        List<Map<String, Object>> result = staffList.stream()
                .map(staff -> {
                    Map<String, Object> data = new java.util.HashMap<>();
                    data.put("id", staff.getId());
                    data.put("email", staff.getEmail() != null ? staff.getEmail() : "");
                    data.put("firstName", staff.getFirstName() != null ? staff.getFirstName() : "");
                    data.put("lastName", staff.getLastName() != null ? staff.getLastName() : "");
                    data.put("role", staff.getRole() != null ? staff.getRole() : "WAREHOUSE_MANAGER");
                    data.put("userRole", staff.getRole() != null ? staff.getRole() : "WAREHOUSE_MANAGER");
                    data.put("isWarehouseStaff", true);
                    data.put("status", "ACTIVE");
                    data.put("createdAt", staff.getCreatedAt());
                    return data;
                })
                .toList();
        return ResponseEntity.ok(result);
    }

    /**
     * Admin नवीन warehouse staff add करतो (AUDITOR, VIEWER, any role)
     * POST /api/auth/admin/warehouse-staff/add
     * Authorization: Bearer <ADMIN token>
     */
    @PostMapping("/admin/warehouse-staff/add")
    public ResponseEntity<?> addStaffByAdmin(
            @RequestBody AddWarehouseStaffRequest request,
            @RequestHeader("Authorization") String token) {
        try {
            String callerRole = jwtUtil.extractRole(token.substring(7));

            // ADMIN किंवा isAdmin check
            if (!"ADMIN".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied. Only Admin can use this endpoint."));
            }

            if (request.getEmail() == null || request.getEmail().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
            }
            if (request.getFirstName() == null || request.getFirstName().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "First name is required"));
            }
            if (request.getRole() == null || request.getRole().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Role is required"));
            }

            String result = authService.addWarehouseStaffByManager(
                    request.getFirstName(),
                    request.getLastName(),
                    request.getEmail().toLowerCase().trim(),
                    request.getRole(),
                    request.getPassword()
            );

            return ResponseEntity.ok(Map.of(
                    "message", result,
                    "email", request.getEmail(),
                    "role", request.getRole().toUpperCase()
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to add staff: " + e.getMessage()));
        }
    }

    /**
     * Admin warehouse staff remove करतो
     * DELETE /api/auth/admin/warehouse-staff/remove
     * Authorization: Bearer <ADMIN token>
     */
    @DeleteMapping("/admin/warehouse-staff/remove")
    public ResponseEntity<?> removeStaffByAdmin(
            @RequestParam Long staffId,
            @RequestHeader("Authorization") String token) {
        try {
            String callerRole = jwtUtil.extractRole(token.substring(7));

            if (!"ADMIN".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied. Only Admin can remove staff."));
            }

            com.pixelbloom.auth_server.dto.WarehouseStaff staff = warehouseStaffRepository.findById(staffId)
                    .orElseThrow(() -> new RuntimeException("Staff not found with id: " + staffId));

            warehouseStaffRepository.deleteById(staffId);

            return ResponseEntity.ok(Map.of(
                    "message", "Staff removed successfully",
                    "email", staff.getEmail(),
                    "role", staff.getRole()
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AUDIT STAFF — separate audit_staff table, managed by Admin only
    // ═══════════════════════════════════════════════════════════════════════════

    /** GET /api/auth/admin/audit-staff — all audit staff */
    @GetMapping("/admin/audit-staff")
    public ResponseEntity<?> getAllAuditStaff(@RequestHeader("Authorization") String token) {
        try {
            String callerRole = jwtUtil.extractRole(token.substring(7));
            if (!"ADMIN".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }
            List<Map<String, Object>> result = auditStaffRepository.findAll().stream()
                .map(s -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id",        s.getId());
                    m.put("email",     s.getEmail() != null ? s.getEmail() : "");
                    m.put("firstName", s.getFirstName() != null ? s.getFirstName() : "");
                    m.put("lastName",  s.getLastName()  != null ? s.getLastName()  : "");
                    m.put("role",      s.getRole()      != null ? s.getRole()      : "");
                    m.put("createdAt", s.getCreatedAt());
                    m.put("status",    "ACTIVE");
                    return m;
                }).toList();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch audit staff: " + e.getMessage()));
        }
    }

    /** POST /api/auth/admin/audit-staff/add — Admin adds AUDITOR or VIEWER */
    @PostMapping("/admin/audit-staff/add")
    public ResponseEntity<?> addAuditStaff(
            @RequestBody AddWarehouseStaffRequest request,
            @RequestHeader("Authorization") String token) {
        try {
            String callerRole = jwtUtil.extractRole(token.substring(7));
            if (!"ADMIN".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }
            if (request.getEmail() == null || request.getEmail().isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
            if (request.getFirstName() == null || request.getFirstName().isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "First name is required"));

            String normalizedRole = request.getRole() != null ? request.getRole().toUpperCase() : "";
            if (!"AUDITOR".equals(normalizedRole) && !"VIEWER".equals(normalizedRole))
                return ResponseEntity.badRequest().body(Map.of("error", "Role must be AUDITOR or VIEWER"));

            String emailLower = request.getEmail().trim().toLowerCase();
            if (auditStaffRepository.existsByEmail(emailLower))
                return ResponseEntity.badRequest().body(Map.of("error", "Audit staff with email '" + emailLower + "' already exists"));

            // Password
            String rawPassword = (request.getPassword() != null && !request.getPassword().isBlank())
                ? request.getPassword().trim()
                : generateAuditPassword();

            AuditStaff staff = new AuditStaff();
            staff.setEmail(emailLower);
            staff.setPassword(passwordEncoder.encode(rawPassword));
            staff.setRole(normalizedRole);
            staff.setFirstName(request.getFirstName().trim());
            staff.setLastName(request.getLastName() != null ? request.getLastName().trim() : "");
            staff.setCreatedAt(java.time.LocalDateTime.now());
            auditStaffRepository.save(staff);

            // Log credentials
            System.out.println("=== NEW AUDIT STAFF ADDED ===");
            System.out.println("Email: " + emailLower);
            System.out.println("Password: " + rawPassword);
            System.out.println("Role: " + normalizedRole);
            System.out.println("Login: /audit/login");
            System.out.println("=============================");

            // Send credentials email
            try {
                warehouseStaffEmailService.sendStaffCredentials(emailLower, request.getFirstName().trim(), normalizedRole, rawPassword);
            } catch (Exception e) {
                System.err.println("Email send failed for " + emailLower + ": " + e.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                "message", "Audit staff added. Credentials sent to " + emailLower,
                "email", emailLower,
                "role", normalizedRole,
                "loginPortal", "/audit/login"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to add audit staff: " + e.getMessage()));
        }
    }

    /** DELETE /api/auth/admin/audit-staff/remove?staffId=X */
    @DeleteMapping("/admin/audit-staff/remove")
    public ResponseEntity<?> removeAuditStaff(
            @RequestParam Long staffId,
            @RequestHeader("Authorization") String token) {
        try {
            String callerRole = jwtUtil.extractRole(token.substring(7));
            if (!"ADMIN".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Admin access required"));
            }
            AuditStaff staff = auditStaffRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Audit staff not found with id: " + staffId));
            auditStaffRepository.deleteById(staffId);
            return ResponseEntity.ok(Map.of("message", "Audit staff removed", "email", staff.getEmail()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String generateAuditPassword() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
        java.util.Random rnd = new java.util.Random();
        StringBuilder sb = new StringBuilder("AU@");
        for (int i = 0; i < 8; i++) sb.append(chars.charAt(rnd.nextInt(chars.length())));
        return sb.toString();
    }

    @GetMapping("/admin/get")
    public List<String> getAllAdmins(@RequestHeader("Authorization") String token) {
        String userEmail = jwtUtil.extractUsername(token.substring(7));
        if (!authService.isAdminEmail(userEmail)) {
            throw new SecurityException("Access denied: Admin privileges required");
        }
        return authService.getAllAdminEmails();
    }

    @PostMapping("/admin/promote")
    public ResponseEntity<?> promoteUserToAdmin(@RequestParam Long customerId,
                                              @RequestHeader(value = "Authorization", required = false) String token) {
        Customer customer = customerService.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        
        String result = authService.createAdmin(customer.getEmail());
        // Update updatedAt so the change is reflected on both screens
        customer.setUpdatedAt(java.time.LocalDateTime.now());
        customerService.updateCustomer(customer);
        return ResponseEntity.ok(Map.of("message", result));
    }

    // mainadmin किंवा कोणत्याही email ला directly admin table मध्ये add करणे
    @PostMapping("/admin/ensure-admin")
    public ResponseEntity<?> ensureAdmin(@RequestParam String email) {
        try {
            String result = authService.ensureAdmin(email);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("message", "Admin already exists or created"));
        }
    }

    @PutMapping("/admin/customer/status")
    public ResponseEntity<?> updateCustomerStatus(@RequestParam Long customerId,
                                                 @RequestParam CustomerStatus status,
                                                 @RequestHeader(value = "Authorization", required = false) String token) {
        customerService.updateStatus(customerId, status);
        return ResponseEntity.ok(Map.of("message", "Customer status updated successfully"));
    }

    @DeleteMapping("/admin/demote")
    public ResponseEntity<?> demoteAdminToUser(@RequestParam Long customerId,
                                             @RequestHeader(value = "Authorization", required = false) String token) {
        Customer customer = customerService.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        
        String result = authService.deleteAdmin(customer.getEmail());
        // Update updatedAt so the change is reflected on both screens
        customer.setUpdatedAt(java.time.LocalDateTime.now());
        customerService.updateCustomer(customer);
        return ResponseEntity.ok(Map.of("message", result));
    }

    @PostMapping("/admin/promote-with-credentials")
    public ResponseEntity<?> promoteUserWithCredentials(@RequestParam String email, 
                                                       @RequestParam String password) {
        try {
            System.out.println("=== PROMOTE WITH CREDENTIALS DEBUG ===");
            System.out.println("Received email: " + email);
            System.out.println("Received password length: " + (password != null ? password.length() : "NULL"));
            
            // Find customer by email
            Customer customer = customerService.findByEmail(email)
                    .orElseThrow(() -> {
                        System.out.println("Customer not found with email: " + email);
                        return new RuntimeException("Wrong email or password");
                    });
            
            System.out.println("Found customer: " + customer.getEmail());
            System.out.println("Customer ID: " + customer.getId());
            System.out.println("Customer password is null: " + (customer.getPassword() == null));
            System.out.println("Customer password length: " + (customer.getPassword() != null ? customer.getPassword().length() : "NULL"));
            System.out.println("Customer status: " + customer.getStatus());
            
            // Check if password matches
            boolean passwordMatches = passwordEncoder.matches(password, customer.getPassword());
            System.out.println("Password matches: " + passwordMatches);
            
            if (!passwordMatches) {
                System.out.println("Password verification failed for email: " + email);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Wrong email or password"));
            }
            
            // Check if customer is active
            if (customer.getStatus() == CustomerStatus.BLOCKED) {
                System.out.println("Customer account is blocked: " + email);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Account is blocked"));
            }
            
            // Create admin with verified credentials
            String result = authService.createAdmin(customer.getEmail());
            System.out.println("Successfully promoted user " + customer.getEmail() + " to admin");
            
            return ResponseEntity.ok(Map.of(
                "message", "User promoted to admin successfully",
                "email", customer.getEmail(),
                "name", customer.getFirstName() + " " + customer.getLastName()
            ));
        } catch (Exception e) {
            System.err.println("Error promoting user with credentials: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Wrong email or password"));
        }
    }

    @DeleteMapping("/admin/customer/{customerId}")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long customerId,
                                            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            customerService.deleteCustomer(customerId);
            return ResponseEntity.ok(Map.of("message", "Customer deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/admin/delete")
    public String removeAdmin(@RequestParam String email,@RequestHeader("Authorization") String token) {
        String userEmail = jwtUtil.extractUsername(token.substring(7));
        if (!authService.isAdminEmail(userEmail)) {
            throw new SecurityException("Access denied: Admin privileges required");
        }
        return authService.deleteAdmin(email);
    }

    // ── Delivery Boy endpoints ────────────────────────────────────────────────

    @PostMapping("/admin/delivery-boy/add")
    public ResponseEntity<?> addDeliveryBoy(@RequestParam Long customerId) {
        Customer customer = customerService.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        String result = authService.addDeliveryBoy(customer.getEmail());
        return ResponseEntity.ok(Map.of("message", result, "email", customer.getEmail()));
    }

    @DeleteMapping("/admin/delivery-boy/remove")
    public ResponseEntity<?> removeDeliveryBoy(@RequestParam Long customerId) {
        Customer customer = customerService.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        String result = authService.removeDeliveryBoy(customer.getEmail());
        return ResponseEntity.ok(Map.of("message", result));
    }

    @GetMapping("/admin/delivery-boys")
    public ResponseEntity<?> getAllDeliveryBoys() {
        return ResponseEntity.ok(authService.getAllDeliveryBoyEmails());
    }

    @GetMapping("/isDeliveryBoy")
    public boolean checkIfDeliveryBoy(@RequestParam String email) {
        return authService.isDeliveryBoyEmail(email);
    }

    // ── OAuth2 failure fallback ───────────────────────────────────────────────

    @GetMapping("/oauth2/failure")
    public ResponseEntity<?> oauth2Failure() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "OAuth2 login failed. Please try again."));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // NEW FEATURES - FR-01 to FR-04 Complete Implementation
    // ══════════════════════════════════════════════════════════════════════════

    // ── Refresh Token endpoints ───────────────────────────────────────────────

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        try {
            String refreshTokenStr = request.get("refreshToken");
            RefreshToken refreshToken = refreshTokenService.verifyRefreshToken(refreshTokenStr);
            
            Customer customer = customerService.findById(refreshToken.getCustomerId())
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            
            boolean isAdmin = authService.isAdminEmail(customer.getEmail());
            boolean isDeliveryBoy = authService.isDeliveryBoyEmail(customer.getEmail());
            String role = isAdmin ? "ADMIN" : isDeliveryBoy ? "DELIVERY_BOY" : "USER";
            
            String newAccessToken = jwtUtil.generateToken(customer.getEmail(), customer.getId(), role);
            
            return ResponseEntity.ok(Map.of(
                    "token", newAccessToken,
                    "refreshToken", refreshTokenStr,
                    "expiresIn", jwtUtil.getTokenValidity() / 1000,
                    "role", role,
                    "customerId", customer.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid or expired refresh token"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> request, 
                                   @RequestHeader("Authorization") String token) {
        try {
            String refreshTokenStr = request.get("refreshToken");
            if (refreshTokenStr != null) {
                refreshTokenService.revokeRefreshToken(refreshTokenStr);
            }
            return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("message", "Logged out"));
        }
    }

    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAll(@RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            Customer customer = customerService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            
            refreshTokenService.revokeAllRefreshTokens(customer.getId());
            return ResponseEntity.ok(Map.of("message", "Logged out from all devices"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Failed to logout"));
        }
    }

    @GetMapping("/active-sessions")
    public ResponseEntity<?> getActiveSessions(@RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            Customer customer = customerService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            
            List<RefreshToken> activeSessions = refreshTokenService.getActiveTokens(customer.getId());
            return ResponseEntity.ok(activeSessions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Failed to fetch sessions"));
        }
    }

    // ── Login Audit endpoints ─────────────────────────────────────────────────

    @GetMapping("/login-history")
    public ResponseEntity<?> getLoginHistory(@RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            Customer customer = customerService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));
            
            List<LoginAudit> history = loginAuditService.getLoginHistory(customer.getId());
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Failed to fetch login history"));
        }
    }

    @GetMapping("/admin/login-history/{customerId}")
    public ResponseEntity<?> getCustomerLoginHistory(@PathVariable Long customerId,
                                                     @RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            if (!authService.isAdminEmail(email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Admin access required"));
            }
            
            List<LoginAudit> history = loginAuditService.getLoginHistory(customerId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch login history"));
        }
    }

    @GetMapping("/admin/login-stats")
    public ResponseEntity<?> getLoginStats(@RequestParam(defaultValue = "30") int days,
                                          @RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            if (!authService.isAdminEmail(email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Admin access required"));
            }
            
            Map<String, Long> stats = loginAuditService.getLoginStats(days);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch login stats"));
        }
    }

    // ── Permission endpoints ──────────────────────────────────────────────────

    @GetMapping("/permissions")
    public ResponseEntity<?> getAllPermissions(@RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            if (!authService.isAdminEmail(email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Admin access required"));
            }
            
            List<Permission> permissions = permissionService.getAllPermissions();
            return ResponseEntity.ok(permissions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch permissions"));
        }
    }

    @PostMapping("/permissions")
    public ResponseEntity<?> createPermission(@RequestBody PermissionRequest request,
                                             @RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            if (!authService.isAdminEmail(email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Admin access required"));
            }
            
            Permission permission = permissionService.createPermission(request);
            return ResponseEntity.ok(permission);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/permissions/role/{role}")
    public ResponseEntity<?> getRolePermissions(@PathVariable String role,
                                               @RequestHeader("Authorization") String token) {
        try {
            List<String> permissions = permissionService.getPermissionsForRole(role);
            return ResponseEntity.ok(Map.of("role", role, "permissions", permissions));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch role permissions"));
        }
    }

    @PostMapping("/permissions/assign")
    public ResponseEntity<?> assignPermissionToRole(@RequestParam String role,
                                                    @RequestParam Long permissionId,
                                                    @RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            if (!authService.isAdminEmail(email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Admin access required"));
            }
            
            permissionService.assignPermissionToRole(role, permissionId);
            return ResponseEntity.ok(Map.of("message", "Permission assigned successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/permissions/remove")
    public ResponseEntity<?> removePermissionFromRole(@RequestParam String role,
                                                      @RequestParam Long permissionId,
                                                      @RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            if (!authService.isAdminEmail(email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Admin access required"));
            }
            
            permissionService.removePermissionFromRole(role, permissionId);
            return ResponseEntity.ok(Map.of("message", "Permission removed successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/permissions/check")
    public ResponseEntity<?> checkPermission(@RequestParam String permissionName,
                                            @RequestHeader("Authorization") String token) {
        try {
            String email = jwtUtil.extractUsername(token.substring(7));
            String role = jwtUtil.extractRole(token.substring(7));
            
            boolean hasPermission = permissionService.hasPermission(role, permissionName);
            return ResponseEntity.ok(Map.of(
                    "email", email,
                    "role", role,
                    "permission", permissionName,
                    "hasPermission", hasPermission
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Failed to check permission"));
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // WAREHOUSE MANAGER — Staff Management Endpoints
    // फक्त WAREHOUSE_MANAGER role असलेल्या user ला access आहे
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Warehouse Manager नवीन staff add करतो
     * POST /api/auth/warehouse/manager/staff/add
     * Authorization: Bearer <WAREHOUSE_MANAGER token>
     */
    @PostMapping("/warehouse/manager/staff/add")
    public ResponseEntity<?> addStaffByManager(
            @RequestBody AddWarehouseStaffRequest request,
            @RequestHeader("Authorization") String token) {
        try {
            // Token मधून role काढा
            String callerRole = jwtUtil.extractRole(token.substring(7));

            // फक्त WAREHOUSE_MANAGER ला permission आहे
            if (!"WAREHOUSE_MANAGER".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied. Only Warehouse Manager can add staff."));
            }

            // Validation
            if (request.getEmail() == null || request.getEmail().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
            }
            if (request.getFirstName() == null || request.getFirstName().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "First name is required"));
            }
            if (request.getRole() == null || request.getRole().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Role is required"));
            }

            String result = authService.addWarehouseStaffByManager(
                    request.getFirstName(),
                    request.getLastName(),
                    request.getEmail().toLowerCase().trim(),
                    request.getRole(),
                    request.getPassword()
            );

            return ResponseEntity.ok(Map.of(
                    "message", result,
                    "email", request.getEmail(),
                    "role", request.getRole().toUpperCase()
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to add staff: " + e.getMessage()));
        }
    }

    /**
     * Warehouse Manager आपल्या warehouse चे सगळे staff बघतो
     * GET /api/auth/warehouse/manager/staff
     * Authorization: Bearer <WAREHOUSE_MANAGER token>
     */
    @GetMapping("/warehouse/manager/staff")
    public ResponseEntity<?> getMyStaff(@RequestHeader("Authorization") String token) {
        try {
            String callerRole = jwtUtil.extractRole(token.substring(7));

            if (!"WAREHOUSE_MANAGER".equals(callerRole) && !"ADMIN".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied."));
            }

            List<com.pixelbloom.auth_server.dto.WarehouseStaff> staffList = warehouseStaffRepository.findAll();

            // WAREHOUSE_MANAGER ला exclude करा — फक्त staff दाखवा
            List<Map<String, Object>> result = staffList.stream()
                    .filter(s -> !"WAREHOUSE_MANAGER".equals(s.getRole()))
                    .map(staff -> {
                        Map<String, Object> data = new java.util.HashMap<>();
                        data.put("id", staff.getId());
                        data.put("email", staff.getEmail() != null ? staff.getEmail() : "");
                        data.put("firstName", staff.getFirstName() != null ? staff.getFirstName() : "");
                        data.put("lastName", staff.getLastName() != null ? staff.getLastName() : "");
                        data.put("role", staff.getRole() != null ? staff.getRole() : "");
                        data.put("createdAt", staff.getCreatedAt());
                        data.put("status", "ACTIVE");
                        return data;
                    })
                    .toList();

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch staff: " + e.getMessage()));
        }
    }

    /**
     * Warehouse Manager staff remove करतो
     * DELETE /api/auth/warehouse/manager/staff/remove
     * Authorization: Bearer <WAREHOUSE_MANAGER token>
     */
    @DeleteMapping("/warehouse/manager/staff/remove")
    public ResponseEntity<?> removeStaffByManager(
            @RequestParam Long staffId,
            @RequestHeader("Authorization") String token) {
        try {
            String callerRole = jwtUtil.extractRole(token.substring(7));

            if (!"WAREHOUSE_MANAGER".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied. Only Warehouse Manager can remove staff."));
            }

            com.pixelbloom.auth_server.dto.WarehouseStaff staff = warehouseStaffRepository.findById(staffId)
                    .orElseThrow(() -> new RuntimeException("Staff not found with id: " + staffId));

            // Manager दुसऱ्या Manager ला remove करू शकत नाही
            if ("WAREHOUSE_MANAGER".equals(staff.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Cannot remove another Warehouse Manager."));
            }

            warehouseStaffRepository.deleteById(staffId);

            return ResponseEntity.ok(Map.of(
                    "message", "Staff removed successfully",
                    "email", staff.getEmail()
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Warehouse Manager staff चा role update करतो
     * PUT /api/auth/warehouse/manager/staff/update-role
     * Authorization: Bearer <WAREHOUSE_MANAGER token>
     */
    @PutMapping("/warehouse/manager/staff/update-role")
    public ResponseEntity<?> updateStaffRole(
            @RequestParam Long staffId,
            @RequestParam String newRole,
            @RequestHeader("Authorization") String token) {
        try {
            String callerRole = jwtUtil.extractRole(token.substring(7));

            if (!"WAREHOUSE_MANAGER".equals(callerRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied. Only Warehouse Manager can update roles."));
            }

            com.pixelbloom.auth_server.dto.WarehouseStaff staff = warehouseStaffRepository.findById(staffId)
                    .orElseThrow(() -> new RuntimeException("Staff not found"));

            if ("WAREHOUSE_MANAGER".equals(staff.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Cannot change role of another Warehouse Manager."));
            }

            String normalizedRole = newRole.toUpperCase();
            staff.setRole(normalizedRole);
            warehouseStaffRepository.save(staff);

            return ResponseEntity.ok(Map.of(
                    "message", "Role updated to " + normalizedRole,
                    "staffId", staffId,
                    "newRole", normalizedRole
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

}
