package com.pixelbloom.auth_server.serviceImpl;

import com.pixelbloom.auth_server.model.RefreshToken;
import com.pixelbloom.auth_server.repository.RefreshTokenRepository;
import com.pixelbloom.auth_server.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {
    
    private final RefreshTokenRepository refreshTokenRepository;
    
    // Refresh token validity: 7 days
    private static final long REFRESH_TOKEN_VALIDITY_DAYS = 7;
    
    @Override
    @Transactional
    public RefreshToken createRefreshToken(Long customerId, String email, String deviceInfo, String ipAddress) {
        // Generate unique refresh token
        String token = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        
        RefreshToken refreshToken = RefreshToken.builder()
                .token(token)
                .customerId(customerId)
                .email(email)
                .expiryDate(LocalDateTime.now().plusDays(REFRESH_TOKEN_VALIDITY_DAYS))
                .createdAt(LocalDateTime.now())
                .revoked(false)
                .deviceInfo(deviceInfo)
                .ipAddress(ipAddress)
                .build();
        
        return refreshTokenRepository.save(refreshToken);
    }
    
    @Override
    public RefreshToken verifyRefreshToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));
        
        if (refreshToken.isExpired()) {
            throw new RuntimeException("Refresh token has expired");
        }
        
        if (Boolean.TRUE.equals(refreshToken.getRevoked())) {
            throw new RuntimeException("Refresh token has been revoked");
        }
        
        return refreshToken;
    }
    
    @Override
    @Transactional
    public void revokeRefreshToken(String token) {
        refreshTokenRepository.revokeByToken(token, LocalDateTime.now());
    }
    
    @Override
    @Transactional
    public void revokeAllRefreshTokens(Long customerId) {
        refreshTokenRepository.revokeAllByCustomerId(customerId, LocalDateTime.now());
    }
    
    @Override
    public List<RefreshToken> getActiveTokens(Long customerId) {
        return refreshTokenRepository.findActiveTokensByCustomerId(customerId, LocalDateTime.now());
    }

    @Override
    public List<Long> getAllActiveCustomerIds() {
        return refreshTokenRepository.findAllActiveCustomerIds(LocalDateTime.now());
    }
    
    @Override
    @Transactional
    @Scheduled(cron = "0 0 2 * * ?") // Run daily at 2 AM
    public void cleanupExpiredTokens() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30); // Delete tokens older than 30 days
        refreshTokenRepository.deleteExpiredTokens(cutoffDate);
    }
}
