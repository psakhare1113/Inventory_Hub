package com.pixelbloom.products.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "session_token")
    private String sessionToken;

    @Column(name = "login_time", nullable = false)
    private LocalDateTime loginTime;

    @Column(name = "logout_time")
    private LocalDateTime logoutTime;

    @Column(name = "last_activity", nullable = false)
    private LocalDateTime lastActivity;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "session_duration_minutes")
    private Long sessionDurationMinutes;

    @PrePersist
    void onCreate() {
        loginTime = LocalDateTime.now();
        lastActivity = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        if (logoutTime != null && loginTime != null) {
            sessionDurationMinutes = java.time.Duration.between(loginTime, logoutTime).toMinutes();
        }
    }
}