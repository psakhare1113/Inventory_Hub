package com.pixelbloom.auth_server.repository;

import com.pixelbloom.auth_server.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    
    Optional<RefreshToken> findByToken(String token);
    
    List<RefreshToken> findByCustomerId(Long customerId);
    
    List<RefreshToken> findByEmail(String email);
    
    @Query("SELECT rt FROM RefreshToken rt WHERE rt.customerId = :customerId AND rt.revoked = false AND rt.expiryDate > :now")
    List<RefreshToken> findActiveTokensByCustomerId(Long customerId, LocalDateTime now);

    @Query("SELECT DISTINCT rt.customerId FROM RefreshToken rt WHERE rt.revoked = false AND rt.expiryDate > :now")
    List<Long> findAllActiveCustomerIds(LocalDateTime now);
    
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :revokedAt WHERE rt.customerId = :customerId")
    void revokeAllByCustomerId(Long customerId, LocalDateTime revokedAt);
    
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :revokedAt WHERE rt.token = :token")
    void revokeByToken(String token, LocalDateTime revokedAt);
    
    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiryDate < :expiryDate")
    void deleteExpiredTokens(LocalDateTime expiryDate);
    
    boolean existsByToken(String token);
}
