package com.pixelbloom.auth_server.dto;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * Audit staff entity — stores AUDITOR and VIEWER roles only.
 * Completely separate from warehouse_staff table.
 * Added by Admin via /api/auth/admin/audit-staff/add
 * Login portal: /audit/login → redirects to /warehouse/dashboard
 */
@Entity
@Table(name = "audit_staff")
@Data
public class AuditStaff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "password", nullable = false)
    private String password;

    /**
     * Role: AUDITOR | VIEWER
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
