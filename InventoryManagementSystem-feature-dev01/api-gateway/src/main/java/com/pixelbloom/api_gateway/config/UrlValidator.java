package com.pixelbloom.api_gateway.config;

import org.springframework.stereotype.Component;
import java.util.Set;

@Component
public class UrlValidator {

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

        // Direct service calls (for Feign clients) - allow authenticated users
        if (path.startsWith("/api/inventory/") ||
                path.startsWith("/api/payments/") ||
                path.startsWith("/api/shipping/") ||
                path.startsWith("/api/products/") ||
                path.startsWith("/api/customer/")) {
            return "USER".equals(role) || "ADMIN".equals(role);
        }

        return true; // Allow other paths (like /api/auth/register, /api/auth/login)
    }
/*
    private static final Set<String> USER_ADMIN_PATHS = Set.of(
            "/api/inventory/reserve",
            "/api/inventory/release",
            "/api/inventory/confirm",
            "/api/payments/pay",
            "/api/payments/refund",
            "/api/shipping/deliver",
            "/api/products/reviews",
            "/api/products/reviews/customer/{customerId}",
            "/api/products/reviews/product/{productId}/customer/{customerId}",
            "/api/orders/submit",
            "/api/orders/user/{userId}",
            "/api/customer/id-by-email",
            "api/auth/customer/{customerId}",
            "/api/orders/order-return-initiated-step1"
    );

    private static final Set<String> ADMIN_ONLY_PATHS = Set.of(
            "/api/auth/admin/",
            "/api/products/add",
            "/api/products/update",
            "/api/products/delete",
            "/api/inventory/add",
            "/api/inventory/update",
            "/api/inventory/delete",
            "/api/customers/delete",
            "/api/orders/approve",
            "/api/orders/reject",
            "/api/orders/return-approved-step2",
            "/api/orders/return-rejected-step2",
            "/api/orders/order-return-initiate-physical-verification-step2",
            "/api/orders/order-return-finalStep3"
    );

    public boolean isUserAdminPath(String path) {
        return USER_ADMIN_PATHS.stream().anyMatch(path::startsWith);
    }

    public boolean isAdminOnlyPath(String path) {
        return ADMIN_ONLY_PATHS.stream().anyMatch(path::startsWith); }

    public boolean hasValidRole(String path, String role) {
        if (isAdminOnlyPath(path)) {
            return "ADMIN".equals(role);
        }
        if (isUserAdminPath(path)) {
            return "USER".equals(role) || "ADMIN".equals(role);
        }
        return true;
    }*/
}
