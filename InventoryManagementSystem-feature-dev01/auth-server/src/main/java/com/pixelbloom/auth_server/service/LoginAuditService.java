package com.pixelbloom.auth_server.service;

import com.pixelbloom.auth_server.model.LoginAudit;
import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface LoginAuditService {
    
    /**
     * Log a login attempt
     */
    void logLoginAttempt(Long customerId, String email, String status, String failureReason, 
                        String loginMethod, HttpServletRequest request);
    
    /**
     * Get login history for a customer
     */
    List<LoginAudit> getLoginHistory(Long customerId);
    
    /**
     * Get login history by email
     */
    List<LoginAudit> getLoginHistoryByEmail(String email);
    
    /**
     * Get recent failed login attempts
     */
    List<LoginAudit> getRecentFailedAttempts(String email, int minutes);
    
    /**
     * Count failed attempts since a specific time
     */
    long countFailedAttemptsSince(String email, LocalDateTime since);
    
    /**
     * Get login statistics
     */
    Map<String, Long> getLoginStats(int days);
    
    /**
     * Check if account should be locked due to failed attempts
     */
    boolean shouldLockAccount(String email);

    /**
     * Extract client IP address from request
     */
    String getClientIpAddress(HttpServletRequest request);

    /**
     * Extract device information from User-Agent
     */
    String extractDeviceInfo(HttpServletRequest request);
}
