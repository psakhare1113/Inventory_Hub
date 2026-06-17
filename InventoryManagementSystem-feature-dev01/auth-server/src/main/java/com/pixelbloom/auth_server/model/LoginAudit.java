package com.pixelbloom.auth_server.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Login Audit Entity for tracking authentication attempts
 * FR-01: Authentication - Login Audit Trail
 */
@Entity
@Table(name = "login_audits", indexes = {
    @Index(name = "idx_customer_id", columnList = "customer_id"),
    @Index(name = "idx_email", columnList = "email"),
    @Index(name = "idx_login_time", columnList = "login_time"),
    @Index(name = "idx_status", columnList = "status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginAudit {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "customer_id")
    private Long customerId;
    
    @Column(nullable = false, length = 255)
    private String email;
    
    @Column(nullable = false, length = 20)
    private String status; // SUCCESS, FAILED, BLOCKED
    
    @Column(name = "login_time", nullable = false)
    private LocalDateTime loginTime;
    
    @Column(name = "ip_address", length = 50)
    private String ipAddress;
    
    @Column(name = "user_agent", length = 500)
    private String userAgent;
    
    @Column(name = "device_info", length = 200)
    private String deviceInfo;
    
    @Column(name = "browser_info", length = 200)
    private String browserInfo;
    
    @Column(name = "location", length = 100)
    private String location; // City, Country
    
    @Column(name = "failure_reason", length = 500)
    private String failureReason;
    
    @Column(name = "login_method", length = 50)
    @Builder.Default
    private String loginMethod = "PASSWORD"; // PASSWORD, OAUTH2_GOOGLE, REFRESH_TOKEN
    
    @Column(name = "session_id", length = 100)
    private String sessionId;
}
