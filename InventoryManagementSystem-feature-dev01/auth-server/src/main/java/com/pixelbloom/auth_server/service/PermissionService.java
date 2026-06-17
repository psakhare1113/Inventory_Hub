package com.pixelbloom.auth_server.service;

import com.pixelbloom.auth_server.dto.PermissionRequest;
import com.pixelbloom.auth_server.model.Permission;

import java.util.List;

public interface PermissionService {
    
    /**
     * Create a new permission
     */
    Permission createPermission(PermissionRequest request);
    
    /**
     * Get all permissions
     */
    List<Permission> getAllPermissions();
    
    /**
     * Get permission by ID
     */
    Permission getPermissionById(Long id);
    
    /**
     * Get permission by name
     */
    Permission getPermissionByName(String name);
    
    /**
     * Get permissions by resource
     */
    List<Permission> getPermissionsByResource(String resource);
    
    /**
     * Update permission
     */
    Permission updatePermission(Long id, PermissionRequest request);
    
    /**
     * Delete permission
     */
    void deletePermission(Long id);
    
    /**
     * Assign permission to role
     */
    void assignPermissionToRole(String role, Long permissionId);
    
    /**
     * Remove permission from role
     */
    void removePermissionFromRole(String role, Long permissionId);
    
    /**
     * Get all permissions for a role
     */
    List<String> getPermissionsForRole(String role);
    
    /**
     * Check if role has permission
     */
    boolean hasPermission(String role, String permissionName);
    
    /**
     * Initialize default permissions
     */
    void initializeDefaultPermissions();
}
