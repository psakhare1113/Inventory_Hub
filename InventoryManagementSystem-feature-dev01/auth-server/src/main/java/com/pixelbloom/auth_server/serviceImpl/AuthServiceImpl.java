package com.pixelbloom.auth_server.serviceImpl;

import com.pixelbloom.auth_server.dto.Admin;
import com.pixelbloom.auth_server.enums.CustomerStatus;
import com.pixelbloom.auth_server.enums.Role;
import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.repository.AdminRepository;
import com.pixelbloom.auth_server.repository.CustomerRepository;
import com.pixelbloom.auth_server.service.AuthService;
import com.pixelbloom.auth_server.utils.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuthServiceImpl implements AuthService {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
   private final AdminRepository adminRepository;

   public AuthServiceImpl(CustomerRepository customerRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, AdminRepository adminRepository) {
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
       this.adminRepository = adminRepository;
   }

    public String registerCustomer(Customer customer) {

        if (customerRepository.findByEmail(customer.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }
        // Check if email exists in admin table
        if (adminRepository.existsByEmail(customer.getEmail())) {
            customer.setRole(Role.ADMIN);
        } else {
            customer.setRole(Role.USER);
        }
        customer.setEmail(customer.getEmail());
        customer.setPassword(passwordEncoder.encode(customer.getPassword()));
        customer.setFirstName(customer.getFirstName());
        customer.setLastName(customer.getLastName());
        customer.setPhoneNumber(customer.getPhoneNumber());
       // customer.setRole(Role.USER);
        customer.setStatus(CustomerStatus.ACTIVE);
        customer.setCreatedAt(LocalDateTime.now());
        customer.setUpdatedAt(LocalDateTime.now());
        customerRepository.save(customer);
      return "User registered successfully";

    }

    @Override
    public void validateToken(String token) {
        jwtUtil.validateToken(token);
    }

    @Override
    public String createAdmin(String email) {
        if (adminRepository.existsByEmail(email)) {
            throw new RuntimeException("Admin email already exists");
        }
        Admin admin = new Admin();
        admin.setEmail(email);
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
    public String deleteAdmin(String email) {
        if (!adminRepository.existsByEmail(email)) {
            throw new RuntimeException("Admin email not found");
        }
        adminRepository.deleteByEmail(email);
        return "Admin email removed successfully";
    }

}

