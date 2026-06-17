package com.pixelbloom.api_gateway.config;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;


@Component
public class JwtValidationFilter implements GlobalFilter, Ordered {
    private final UrlValidator urlValidator;


    public JwtValidationFilter(UrlValidator urlValidator) {
        this.urlValidator = urlValidator;
    }

    private static final String SECRET = "myVeryLongLongveryverylongSecretKeyVeryLongSecretKeyThatIsAtLeast32CharactersVeryLongSecretKeyThatIsAtLeast32CharactersThatIsAtLeast32CharactersLongForJWTSecurityPurposes123456789";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        // Allow public endpoints without any token validation
        if (path.startsWith("/api/auth/register") ||
            path.startsWith("/api/auth/token") ||
            path.startsWith("/api/auth/verify-otp") ||
            path.startsWith("/api/auth/resend-otp") ||
            path.startsWith("/api/auth/validate") ||
            path.startsWith("/api/auth/isAdmin") ||
            path.startsWith("/api/auth/createAdmin") ||
            path.startsWith("/api/auth/user/profile") ||
            // ── Delivery Boy Self-Registration (public — no token needed) ──
            path.equals("/api/auth/delivery/apply") ||
            path.startsWith("/api/auth/delivery/application/status") ||
            // ── End Delivery Registration ──
            path.startsWith("/api/auth/admin/customers") ||
            path.startsWith("/api/auth/admin/get") ||
            path.startsWith("/api/auth/admin/promote") ||
            path.startsWith("/api/auth/admin/ensure-admin") ||
            path.startsWith("/api/auth/admin/demote") ||
            path.startsWith("/api/auth/admin/delete") ||
            path.startsWith("/api/auth/admin/customer") ||
            path.startsWith("/api/auth/admin/delivery-boy") ||
            path.startsWith("/api/auth/admin/delivery-boys") ||
            path.startsWith("/api/auth/isDeliveryBoy") ||
            path.startsWith("/api/auth/customer") ||
            path.startsWith("/api/categories") ||
            path.startsWith("/api/subcategories") ||
            path.startsWith("/api/products") ||
            path.startsWith("/api/images") ||
            path.startsWith("/api/product-attributes") ||
            path.startsWith("/api/inventory") ||
            path.startsWith("/api/analytics") ||
            // ── Warehouse staff order status updates (PACKER, PICKER, SHIPPING) ──
            path.startsWith("/api/auth/admin/orders/")) {
            return chain.filter(exchange);
        }

        // Extract and validate token for protected endpoints
        String token = extractToken(exchange);
        if (token == null || !isValidToken(token)) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // Check role-based access for admin endpoints
        String role = extractRole(token);

        // Warehouse roles are allowed to access specific admin paths for order/warehouse operations
        boolean isWarehouseRole = role != null && java.util.Set.of(
            "WAREHOUSE_MANAGER", "RECEIVING", "AUDITOR", "PICKER", "PACKER", "SHIPPING", "VIEWER"
        ).contains(role);

        // Warehouse-accessible admin paths (order status updates, warehouse ops)
        boolean isWarehouseAdminPath =
            path.startsWith("/api/auth/admin/orders/") ||
            path.startsWith("/api/auth/admin/warehouse/") ||
            path.startsWith("/api/auth/admin/purchase-orders");

        if (path.startsWith("/api/auth/admin/") && !"ADMIN".equals(role)
                && !(isWarehouseRole && isWarehouseAdminPath)) {
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            return exchange.getResponse().setComplete();
        }
        
        // Check role-based access using validator for other protected endpoints
        if (!urlValidator.hasValidRole(path, role)) {
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            return exchange.getResponse().setComplete();
        }

        return chain.filter(exchange);
    }


    private String extractToken(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        return (authHeader != null && authHeader.startsWith("Bearer ")) ?
                authHeader.substring(7) : null;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private boolean isValidToken(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(getSigningKey()).build()
                    .parseSignedClaims(token).getPayload();
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    private String extractRole(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(getSigningKey()).build()
                    .parseSignedClaims(token).getPayload();
            return claims.get("role", String.class);
        } catch (Exception e) {
            return null;
        }
    }

}