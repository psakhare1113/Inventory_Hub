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
    private static final long REFRESH_TOKEN_VALIDITY = TimeUnit.DAYS.toMillis(7);

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String username, Long customerId) {
        return generateToken(username, customerId, "USER");
    }

    public String generateToken(String username, Long customerId, String role) {
        return Jwts.builder()
                .subject(username)
                .claim("customerId", customerId)
                .claim("role", role)
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

    public Long getTokenValidity() {
        return VALIDITY;
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

    public void validateAdminAccess(String authHeader, String email) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Missing or invalid authorization header");
        }
        String token = authHeader.substring(7);
        validateToken(token);
        // Admin access is now determined by checking if email exists in admin table
        // This check should be done in the service layer
    }
}
