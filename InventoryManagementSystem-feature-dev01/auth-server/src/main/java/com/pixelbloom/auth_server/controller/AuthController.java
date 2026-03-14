package com.pixelbloom.auth_server.controller;

import com.pixelbloom.auth_server.dto.AuthRequest;
import com.pixelbloom.auth_server.dto.LoginRequest;
import com.pixelbloom.auth_server.enums.CustomerStatus;
import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.service.AuthService;
import com.pixelbloom.auth_server.service.CustomerService;
import com.pixelbloom.auth_server.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import org.springframework.beans.factory.annotation.Autowired;

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



    public AuthController(AuthService authService,CustomerService customerService, AuthenticationManager authenticationManager,JwtUtil jwtUtil) {
        this.authService = authService;
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.customerService = customerService;
    }

    @PostMapping("/register")
    public String addNewUser(@RequestBody Customer user) {
        return authService.registerCustomer(user);
    }

    @PostMapping("/token")
    public ResponseEntity<?> loginCustomer(@RequestBody LoginRequest request) {

        Customer customer = customerService.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (customer.getStatus() == CustomerStatus.BLOCKED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Account is blocked"));
        }

        Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                        request.getEmail(),request.getPassword()));

        if (!authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        }

        String token = jwtUtil.generateToken(customer.getEmail(),customer.getRole().name(),customer.getId());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "role", customer.getRole().name(),
                "customerId", customer.getId(),
                "firstName", customer.getFirstName(),
                "lastName", customer.getLastName()
        ));
    }

    @GetMapping("/validate")
    public String validateToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.validateToken(token);
            return "Token is valid";
        }
        throw new RuntimeException("No token provided");
    }

    @PostMapping("/createAdmin")
    public String createAdmin(@RequestParam String email,
                              @RequestHeader("Authorization") String token) {
        jwtUtil.validateAdminAccess(token);
        return authService.createAdmin(email);
    }


    @GetMapping("/isAdmin")
    public boolean checkIfAdmin(@RequestParam String email) {
        // This can remain public for registration checks
        return authService.isAdminEmail(email);
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<?> getCustomer(@PathVariable Long customerId) {
        // Validate token and get customer details
        Optional<Customer> customer = customerService.findById(customerId);
        return ResponseEntity.ok(customer);
    }

    @PutMapping("/admin/customer/{customerId}/role")
    public ResponseEntity<?> updateCustomerRole(
            @PathVariable Long customerId,
            @RequestParam String role,
            @RequestHeader("Authorization") String token) {
        jwtUtil.validateAdminAccess(token);
        Customer customer = customerService.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        customer.setRole(com.pixelbloom.auth_server.enums.Role.valueOf(role));
        customerService.updateCustomer(customer);
        return ResponseEntity.ok("Role updated successfully");
    }

    @GetMapping("/admin/customers")
    public ResponseEntity<?> getAllCustomers() {
        List<Customer> customers = customerService.findAll();
        return ResponseEntity.ok(customers);
    }

    @GetMapping("/admin/get")
    public List<String> getAllAdmins(@RequestHeader("Authorization") String token) {
        jwtUtil.validateAdminAccess(token);
        return authService.getAllAdminEmails();
    }

    @DeleteMapping("/admin/delete")
    public String removeAdmin(@RequestParam String email,@RequestHeader("Authorization") String token) {
        jwtUtil.validateAdminAccess(token);
        return authService.deleteAdmin(email);
    }

}
