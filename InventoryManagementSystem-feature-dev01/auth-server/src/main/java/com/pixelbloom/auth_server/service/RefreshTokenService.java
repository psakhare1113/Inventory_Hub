package com.pixelbloom.auth_server.service;

import com.pixelbloom.auth_server.model.RefreshToken;

import java.util.List;

public interface RefreshTokenService {
    
    /**
     * Create a new refresh token for a customer
     */
    RefreshToken createRefreshToken(Long customerId, String email, String deviceInfo, String ipAddress);
    
    /**
     * Verify and get refresh token
     */
    RefreshToken verifyRefreshToken(String token);
    
    /**
     * Revoke a specific refresh token
     */
    void revokeRefreshToken(String token);
    
    /**
     * Revoke all refresh tokens for a customer
     */
    void revokeAllRefreshTokens(Long customerId);
    
    /**
     * Get all active refresh tokens for a customer
     */
    List<RefreshToken> getActiveTokens(Long customerId);

    /**
     * Get all customer IDs that currently have at least one active session
     */
    List<Long> getAllActiveCustomerIds();

    /**
     * Clean up expired tokens (scheduled task)
     */
    void cleanupExpiredTokens();
}
