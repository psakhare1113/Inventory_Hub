package com.pixelbloom.auth_server.repository;

import com.pixelbloom.auth_server.model.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {
    
    List<RolePermission> findByRole(String role);
    
    List<RolePermission> findByPermissionId(Long permissionId);
    
    @Query("SELECT rp FROM RolePermission rp WHERE rp.role = :role AND rp.permissionId = :permissionId")
    RolePermission findByRoleAndPermissionId(String role, Long permissionId);
    
    @Query("SELECT p.id FROM Permission p JOIN RolePermission rp ON p.id = rp.permissionId WHERE rp.role = :role")
    List<Long> findPermissionIdsByRole(String role);
    
    @Query("SELECT p.name FROM Permission p JOIN RolePermission rp ON p.id = rp.permissionId WHERE rp.role = :role")
    List<String> findPermissionNamesByRole(String role);
    
    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.role = :role AND rp.permissionId = :permissionId")
    void deleteByRoleAndPermissionId(String role, Long permissionId);
    
    @Modifying
    @Query("DELETE FROM RolePermission rp WHERE rp.role = :role")
    void deleteByRole(String role);
    
    boolean existsByRoleAndPermissionId(String role, Long permissionId);
}
