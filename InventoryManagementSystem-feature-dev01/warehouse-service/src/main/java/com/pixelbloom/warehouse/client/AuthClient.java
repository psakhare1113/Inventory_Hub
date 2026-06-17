package com.pixelbloom.warehouse.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * HTTP client to fetch Warehouse Staff from auth-server.
 *
 * Used by Warehouse Manager assignment flow:
 *   Manager assigns Picker + Packer to a PickList.
 *   warehouse-service needs to fetch staff list from auth-server.
 *
 * Endpoint: GET /api/auth/warehouse/manager/staff
 */
@Component
@Slf4j
public class AuthClient {

    private final RestTemplate restTemplate;
    private final String authServerUrl;

    public AuthClient(RestTemplate restTemplate,
                      @Value("${auth.service.url:http://localhost:9091}") String authServerUrl) {
        this.restTemplate = restTemplate;
        this.authServerUrl = authServerUrl;
    }

    /**
     * Fetch all warehouse staff (PICKER, PACKER, RECEIVING, SHIPPING, AUDITOR).
     * Requires a valid Manager/Admin JWT token.
     *
     * @param bearerToken  Authorization header value (e.g. "Bearer eyJ...")
     * @return list of staff maps with id, email, firstName, lastName, role
     */
    public List<Map<String, Object>> getWarehouseStaff(String bearerToken) {
        try {
            String url = authServerUrl + "/api/auth/warehouse/manager/staff";

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", bearerToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<>() {}
            );

            List<Map<String, Object>> staff = response.getBody();
            log.info("Fetched {} warehouse staff from auth-server", staff != null ? staff.size() : 0);
            return staff != null ? staff : Collections.emptyList();

        } catch (Exception e) {
            log.warn("Could not fetch warehouse staff from auth-server: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Fetch staff filtered by role (PICKER / PACKER / etc.)
     */
    public List<Map<String, Object>> getStaffByRole(String bearerToken, String role) {
        return getWarehouseStaff(bearerToken).stream()
                .filter(s -> role.equalsIgnoreCase((String) s.get("role")))
                .toList();
    }

    // ── DTO ──────────────────────────────────────────────────────────────────

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffDto {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
        private String role;
        private String status;
    }
}
