package com.pixelbloom.auth_server.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PermissionRequest {
    
    @NotBlank(message = "Permission name is required")
    private String name;
    
    private String description;
    
    @NotBlank(message = "Resource is required")
    private String resource;
    
    @NotBlank(message = "Action is required")
    private String action;
}
