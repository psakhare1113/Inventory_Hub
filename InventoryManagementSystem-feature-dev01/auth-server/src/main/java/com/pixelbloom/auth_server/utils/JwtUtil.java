package com.pixelbloom.auth_server.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.concurrent.TimeUnit;

@Component
public class JwtUtil {

    private static final String SECRET = "myVeryLongLongveryverylongSecretKeyVeryLongSecretKeyThatIsAtLeast32CharactersVeryLongSecretKeyThatIsAtLeast32CharactersThatIsAtLeast32CharactersLongForJWTSecurityPurposes123456789";

    private static final long VALIDITY = TimeUnit.HOURS.toMillis(24);

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String username, String role, Long customerId) {
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .claim("customerId", customerId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + VALIDITY))
                .signWith(getSigningKey())
                .compact();
    }

    public Long extractCustomerId(String token) {
        return extractAllClaims(token).get("customerId", Long.class);
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    public void validateToken(String token) {
        Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
    }

    public void validateAdminAccess(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Missing or invalid authorization header");
        }
        String token = authHeader.substring(7);
        validateToken(token);
        String role = extractRole(token);
        if (!"ADMIN".equals(role)) {
            throw new RuntimeException("Access denied: Admin role required");
        }
    }
}
