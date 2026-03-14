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

        // Allow public endpoints
        if (path.startsWith("/api/auth/") || 
            path.startsWith("/api/categories") || 
            path.startsWith("/api/subcategories") ||
            path.startsWith("/api/products") ||
            path.startsWith("/api/product-attributes") ||
            path.startsWith("/api/inventory") ||
            path.startsWith("/api/orders") ||
            path.startsWith("/api/analytics")) {
            return chain.filter(exchange);
        }

        // Extract and validate token- for both
        String token = extractToken(exchange);
        if (token == null || !isValidToken(token)) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // Check role-based access- only admins
        String role = extractRole(token);
        if (path.startsWith("/api/auth/admin/") && !"ADMIN".equals(role)) {
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            return exchange.getResponse().setComplete();
        }
        // Allow /api/inventory/** for both USER and ADMIN (for Feign clients)
        // Check role-based access using validator
        if (!urlValidator.hasValidRole(path, role)) {
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            return exchange.getResponse().setComplete();

        }

        // Route to target service
        return chain.filter(exchange);
    }


    private String extractToken(ServerWebExchange exchange) {
        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        String token = (authHeader != null && authHeader.startsWith("Bearer ")) ?
                authHeader.substring(7) : null;

        System.out.println("Extracted token length: " + (token != null ? token.length() : "null"));
        return token;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public int getOrder() {
        return -1;
    }

    // Check token expiration in JwtValidationFilter
    private boolean isValidToken(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(getSigningKey()).build()
                    .parseSignedClaims(token).getPayload();

            // Add expiration check logging
            Date expiration = claims.getExpiration();
            System.out.println("Token expires at: " + expiration);
            System.out.println("Current time: " + new Date());

            return true;
        } catch (Exception e) {
            System.out.println("Token validation failed: " + e.getMessage());
            return false;
        }
    }


    private String extractRole(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(getSigningKey()).build()
                    .parseSignedClaims(token).getPayload();
            String role = claims.get("role", String.class);
            System.out.println("Extracted role: " + role);
            return role;
        } catch (Exception e) {
            System.out.println("Role extraction failed: " + e.getMessage());
            return null;
        }
    }

}