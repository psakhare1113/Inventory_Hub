package com.pixelbloom.auth_server.service;

import com.pixelbloom.auth_server.model.Customer;

import java.util.List;

public interface AuthService {
    String registerCustomer(Customer customer);
    void validateToken(String token);

    String createAdmin(String email);
    String ensureAdmin(String email);

    List<String> getAllAdminEmails();
    boolean isAdminEmail(String email);
    String deleteAdmin(String email);

    String verifyOtp(String email, String otp);
    String resendOtp(String email);

    // Delivery Boy management
    String addDeliveryBoy(String email);
    boolean isDeliveryBoyEmail(String email);
    String removeDeliveryBoy(String email);
    List<String> getAllDeliveryBoyEmails();

    // Warehouse Staff management
    String addWarehouseStaff(String email, String role);
    boolean isWarehouseStaffEmail(String email);
    String getWarehouseStaffRole(String email);
    String removeWarehouseStaff(String email);

    /**
     * Warehouse Manager द्वारे नवीन staff add करणे — credentials email पाठवतो
     * Returns: generated raw password (for logging)
     */
    String addWarehouseStaffByManager(String firstName, String lastName, String email,
                                      String role, String customPassword);
}
