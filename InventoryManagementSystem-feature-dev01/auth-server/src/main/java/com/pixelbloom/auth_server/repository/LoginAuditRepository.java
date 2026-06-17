package com.pixelbloom.auth_server.repository;

import com.pixelbloom.auth_server.model.LoginAudit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginAuditRepository extends JpaRepository<LoginAudit, Long> {
    
    List<LoginAudit> findByCustomerId(Long customerId);
    
    List<LoginAudit> findByEmail(String email);
    
    Page<LoginAudit> findByCustomerId(Long customerId, Pageable pageable);
    
    Page<LoginAudit> findByEmail(String email, Pageable pageable);
    
    @Query("SELECT la FROM LoginAudit la WHERE la.customerId = :customerId AND la.loginTime BETWEEN :startDate AND :endDate ORDER BY la.loginTime DESC")
    List<LoginAudit> findByCustomerIdAndDateRange(Long customerId, LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT la FROM LoginAudit la WHERE la.email = :email AND la.status = :status ORDER BY la.loginTime DESC")
    List<LoginAudit> findByEmailAndStatus(String email, String status);
    
    @Query("SELECT la FROM LoginAudit la WHERE la.email = :email AND la.status = 'FAILED' AND la.loginTime > :since ORDER BY la.loginTime DESC")
    List<LoginAudit> findRecentFailedAttempts(String email, LocalDateTime since);
    
    @Query("SELECT COUNT(la) FROM LoginAudit la WHERE la.email = :email AND la.status = 'FAILED' AND la.loginTime > :since")
    long countFailedAttemptsSince(String email, LocalDateTime since);
    
    @Query("SELECT la FROM LoginAudit la WHERE la.ipAddress = :ipAddress AND la.loginTime > :since ORDER BY la.loginTime DESC")
    List<LoginAudit> findByIpAddressSince(String ipAddress, LocalDateTime since);
    
    @Query("SELECT la FROM LoginAudit la WHERE la.loginTime BETWEEN :startDate AND :endDate ORDER BY la.loginTime DESC")
    List<LoginAudit> findByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT la.status, COUNT(la) FROM LoginAudit la WHERE la.loginTime > :since GROUP BY la.status")
    List<Object[]> getLoginStatsSince(LocalDateTime since);
}
