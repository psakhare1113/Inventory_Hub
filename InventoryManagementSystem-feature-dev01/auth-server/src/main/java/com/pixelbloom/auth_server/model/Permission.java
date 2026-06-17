package com.pixelbloom.auth_server.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Permission Entity for fine-grained access control
 * FR-02: Authorization - Fine-grained Permissions
 */
@Entity
@Table(name = "permissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Permission {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 100)
    private String name; // e.g., "PRODUCT_CREATE", "ORDER_VIEW", "INVENTORY_UPDATE"
    
    @Column(length = 500)
    private String description;
    
    @Column(nullable = false, length = 50)
    private String resource; // e.g., "PRODUCT", "ORDER", "INVENTORY", "USER"
    
    @Column(nullable = false, length = 50)
    private String action; // e.g., "CREATE", "READ", "UPDATE", "DELETE", "APPROVE"
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
