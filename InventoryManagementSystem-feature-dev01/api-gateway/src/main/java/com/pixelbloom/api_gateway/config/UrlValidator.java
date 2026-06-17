package com.pixelbloom.api_gateway.config;

import org.springframework.stereotype.Component;

@Component
public class UrlValidator {

    // Warehouse operational roles
    private static final java.util.Set<String> WAREHOUSE_ROLES = java.util.Set.of(
        "WAREHOUSE_MANAGER", "RECEIVING", "AUDITOR", "PICKER", "PACKER", "SHIPPING", "VIEWER"
    );

    private boolean isDeliveryBoy(String role) {
        return "DELIVERY_BOY".equals(role);
    }

    private boolean isWarehouseRole(String role) {
        return role != null && WAREHOUSE_ROLES.contains(role);
    }

    public boolean hasValidRole(String path, String role) {
        // Role-based path validation
        if (path.startsWith("/api/auth/admin/")) {
            return "ADMIN".equals(role);
        }

        if (path.startsWith("/api/auth/user/")) {
            return "USER".equals(role) || "ADMIN".equals(role);
        }

        // Public endpoints - no authentication required
        if (path.startsWith("/api/categories") ||
            path.startsWith("/api/subcategories")) {
            return true;
        }

        // Warehouse service paths — allow warehouse roles + admin
        if (path.startsWith("/api/warehouse/")) {
            return "ADMIN".equals(role) || isWarehouseRole(role);
        }

        // Shipping service paths — allow warehouse roles (PACKER, SHIPPING) + standard roles
        if (path.startsWith("/api/shipping/")) {
            return "USER".equals(role) || "ADMIN".equals(role) || isWarehouseRole(role);
        }

        // Orders service paths — allow warehouse roles + standard roles + delivery boys
        if (path.startsWith("/api/orders/")) {
            return "USER".equals(role) || "ADMIN".equals(role) || isWarehouseRole(role) || isDeliveryBoy(role);
        }

        // Direct service calls (for Feign clients) - allow authenticated users
        if (path.startsWith("/api/inventory/") ||
                path.startsWith("/api/payments/") ||
                path.startsWith("/api/products/") ||
                path.startsWith("/api/customer/")) {
            return "USER".equals(role) || "ADMIN".equals(role) || isWarehouseRole(role);
        }

        return true; // Allow other paths (like /api/auth/register, /api/auth/login)
    }
}
