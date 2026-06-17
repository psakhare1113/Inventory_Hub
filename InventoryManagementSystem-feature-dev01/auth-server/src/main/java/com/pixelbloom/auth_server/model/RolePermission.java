package com.pixelbloom.auth_server.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Role-Permission Mapping Entity
 * FR-02: Authorization - Role-based Permission Assignment
 */
@Entity
@Table(name = "role_permissions", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"role", "permission_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RolePermission {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 50)
    private String role; // USER, ADMIN, DELIVERY_BOY
    
    @Column(name = "permission_id", nullable = false)
    private Long permissionId;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
