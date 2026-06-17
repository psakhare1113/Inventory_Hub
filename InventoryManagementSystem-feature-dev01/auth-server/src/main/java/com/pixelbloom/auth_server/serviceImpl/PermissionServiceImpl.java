package com.pixelbloom.auth_server.serviceImpl;

import com.pixelbloom.auth_server.dto.PermissionRequest;
import com.pixelbloom.auth_server.model.Permission;
import com.pixelbloom.auth_server.model.RolePermission;
import com.pixelbloom.auth_server.repository.PermissionRepository;
import com.pixelbloom.auth_server.repository.RolePermissionRepository;
import com.pixelbloom.auth_server.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {
    
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    
    @Override
    @Transactional
    public Permission createPermission(PermissionRequest request) {
        if (permissionRepository.existsByName(request.getName())) {
            throw new RuntimeException("Permission already exists: " + request.getName());
        }
        
        Permission permission = Permission.builder()
                .name(request.getName())
                .description(request.getDescription())
                .resource(request.getResource())
                .action(request.getAction())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        return permissionRepository.save(permission);
    }
    
    @Override
    public List<Permission> getAllPermissions() {
        return permissionRepository.findAll();
    }
    
    @Override
    public Permission getPermissionById(Long id) {
        return permissionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permission not found"));
    }
    
    @Override
    public Permission getPermissionByName(String name) {
        return permissionRepository.findByName(name)
                .orElseThrow(() -> new RuntimeException("Permission not found: " + name));
    }
    
    @Override
    public List<Permission> getPermissionsByResource(String resource) {
        return permissionRepository.findByResource(resource);
    }
    
    @Override
    @Transactional
    public Permission updatePermission(Long id, PermissionRequest request) {
        Permission permission = getPermissionById(id);
        permission.setName(request.getName());
        permission.setDescription(request.getDescription());
        permission.setResource(request.getResource());
        permission.setAction(request.getAction());
        permission.setUpdatedAt(LocalDateTime.now());
        return permissionRepository.save(permission);
    }
    
    @Override
    @Transactional
    public void deletePermission(Long id) {
        if (!permissionRepository.existsById(id)) {
            throw new RuntimeException("Permission not found");
        }
        permissionRepository.deleteById(id);
    }
    
    @Override
    @Transactional
    public void assignPermissionToRole(String role, Long permissionId) {
        if (!permissionRepository.existsById(permissionId)) {
            throw new RuntimeException("Permission not found");
        }
        
        if (rolePermissionRepository.existsByRoleAndPermissionId(role, permissionId)) {
            throw new RuntimeException("Permission already assigned to role");
        }
        
        RolePermission rolePermission = RolePermission.builder()
                .role(role)
                .permissionId(permissionId)
                .createdAt(LocalDateTime.now())
                .build();
        
        rolePermissionRepository.save(rolePermission);
    }
    
    @Override
    @Transactional
    public void removePermissionFromRole(String role, Long permissionId) {
        rolePermissionRepository.deleteByRoleAndPermissionId(role, permissionId);
    }
    
    @Override
    public List<String> getPermissionsForRole(String role) {
        return rolePermissionRepository.findPermissionNamesByRole(role);
    }
    
    @Override
    public boolean hasPermission(String role, String permissionName) {
        List<String> permissions = getPermissionsForRole(role);
        return permissions.contains(permissionName);
    }
    
    @Override
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initializeDefaultPermissions() {
        // Product permissions
        createPermissionIfNotExists("PRODUCT_CREATE", "Create products", "PRODUCT", "CREATE");
        createPermissionIfNotExists("PRODUCT_READ", "View products", "PRODUCT", "READ");
        createPermissionIfNotExists("PRODUCT_UPDATE", "Update products", "PRODUCT", "UPDATE");
        createPermissionIfNotExists("PRODUCT_DELETE", "Delete products", "PRODUCT", "DELETE");
        
        // Order permissions
        createPermissionIfNotExists("ORDER_CREATE", "Create orders", "ORDER", "CREATE");
        createPermissionIfNotExists("ORDER_READ", "View orders", "ORDER", "READ");
        createPermissionIfNotExists("ORDER_UPDATE", "Update orders", "ORDER", "UPDATE");
        createPermissionIfNotExists("ORDER_CANCEL", "Cancel orders", "ORDER", "CANCEL");
        createPermissionIfNotExists("ORDER_APPROVE", "Approve orders", "ORDER", "APPROVE");
        
        // Inventory permissions
        createPermissionIfNotExists("INVENTORY_READ", "View inventory", "INVENTORY", "READ");
        createPermissionIfNotExists("INVENTORY_UPDATE", "Update inventory", "INVENTORY", "UPDATE");
        createPermissionIfNotExists("INVENTORY_ADJUST", "Adjust inventory", "INVENTORY", "ADJUST");
        
        // User permissions
        createPermissionIfNotExists("USER_CREATE", "Create users", "USER", "CREATE");
        createPermissionIfNotExists("USER_READ", "View users", "USER", "READ");
        createPermissionIfNotExists("USER_UPDATE", "Update users", "USER", "UPDATE");
        createPermissionIfNotExists("USER_DELETE", "Delete users", "USER", "DELETE");
        createPermissionIfNotExists("USER_BLOCK", "Block users", "USER", "BLOCK");
        
        // Payment permissions
        createPermissionIfNotExists("PAYMENT_READ", "View payments", "PAYMENT", "READ");
        createPermissionIfNotExists("PAYMENT_REFUND", "Refund payments", "PAYMENT", "REFUND");
        
        // Shipping permissions
        createPermissionIfNotExists("SHIPPING_READ", "View shipments", "SHIPPING", "READ");
        createPermissionIfNotExists("SHIPPING_UPDATE", "Update shipments", "SHIPPING", "UPDATE");
        createPermissionIfNotExists("SHIPPING_ASSIGN", "Assign delivery boy", "SHIPPING", "ASSIGN");
        
        // Warehouse permissions
        createPermissionIfNotExists("WAREHOUSE_READ", "View warehouse", "WAREHOUSE", "READ");
        createPermissionIfNotExists("WAREHOUSE_UPDATE", "Update warehouse", "WAREHOUSE", "UPDATE");
        createPermissionIfNotExists("WAREHOUSE_TRANSFER", "Transfer inventory", "WAREHOUSE", "TRANSFER");
        
        // Report permissions
        createPermissionIfNotExists("REPORT_VIEW", "View reports", "REPORT", "VIEW");
        createPermissionIfNotExists("REPORT_EXPORT", "Export reports", "REPORT", "EXPORT");
        
        // Assign default permissions to roles
        assignDefaultPermissionsToRoles();
    }
    
    private void createPermissionIfNotExists(String name, String description, String resource, String action) {
        if (!permissionRepository.existsByName(name)) {
            Permission permission = Permission.builder()
                    .name(name)
                    .description(description)
                    .resource(resource)
                    .action(action)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            permissionRepository.save(permission);
        }
    }
    
    private void assignDefaultPermissionsToRoles() {
        // ADMIN - All permissions
        List<Permission> allPermissions = permissionRepository.findAll();
        for (Permission permission : allPermissions) {
            if (!rolePermissionRepository.existsByRoleAndPermissionId("ADMIN", permission.getId())) {
                RolePermission rp = RolePermission.builder()
                        .role("ADMIN")
                        .permissionId(permission.getId())
                        .createdAt(LocalDateTime.now())
                        .build();
                rolePermissionRepository.save(rp);
            }
        }
        
        // USER - Limited permissions
        String[] userPermissions = {
            "PRODUCT_READ", "ORDER_CREATE", "ORDER_READ", "ORDER_CANCEL",
            "INVENTORY_READ", "PAYMENT_READ", "SHIPPING_READ"
        };
        assignPermissionsToRole("USER", userPermissions);
        
        // DELIVERY_BOY - Shipping focused permissions
        String[] deliveryBoyPermissions = {
            "ORDER_READ", "SHIPPING_READ", "SHIPPING_UPDATE"
        };
        assignPermissionsToRole("DELIVERY_BOY", deliveryBoyPermissions);
    }
    
    private void assignPermissionsToRole(String role, String[] permissionNames) {
        for (String permissionName : permissionNames) {
            Permission permission = permissionRepository.findByName(permissionName).orElse(null);
            if (permission != null && !rolePermissionRepository.existsByRoleAndPermissionId(role, permission.getId())) {
                RolePermission rp = RolePermission.builder()
                        .role(role)
                        .permissionId(permission.getId())
                        .createdAt(LocalDateTime.now())
                        .build();
                rolePermissionRepository.save(rp);
            }
        }
    }
}
