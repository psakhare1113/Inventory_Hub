package com.pixelbloom.auth_server.dto;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Warehouse staff entity — stores all 6 warehouse roles:
 * WAREHOUSE_MANAGER, RECEIVING, PICKER, PACKER, SHIPPING, AUDITOR
 */
@Entity
@Table(name = "warehouse_staff")
@Data
public class WarehouseStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    /**
     * Role: WAREHOUSE_MANAGER | RECEIVING | PICKER | PACKER | SHIPPING | AUDITOR | VIEWER
     */
    @Column(name = "role", nullable = false)
    private String role;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
