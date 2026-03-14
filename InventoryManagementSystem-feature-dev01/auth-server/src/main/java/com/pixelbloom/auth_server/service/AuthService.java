package com.pixelbloom.auth_server.service;

import com.pixelbloom.auth_server.model.Customer;


import java.util.List;
import java.util.Optional;

public interface AuthService {
    String registerCustomer(Customer customer);
    void validateToken(String token);

    String createAdmin(String email);

    List<String> getAllAdminEmails();
    boolean isAdminEmail(String email);
    String deleteAdmin(String email);
}
