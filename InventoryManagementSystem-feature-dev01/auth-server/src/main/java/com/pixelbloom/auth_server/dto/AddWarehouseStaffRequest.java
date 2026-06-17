package com.pixelbloom.auth_server.dto;

import lombok.Data;

/**
 * Request DTO for adding new warehouse staff
 * Used by Warehouse Manager to add new staff
 */
@Data
public class AddWarehouseStaffRequest {
    private String email;
    private String firstName;
    private String lastName;
    private String role; // RECEIVING, PICKER, PACKER, SHIPPING, AUDITOR, VIEWER
    private String password; // Optional - auto-generated if not provided
}
