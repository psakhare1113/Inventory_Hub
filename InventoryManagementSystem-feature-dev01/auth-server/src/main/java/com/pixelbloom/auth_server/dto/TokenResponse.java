package com.pixelbloom.auth_server.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn; // seconds
    private Long customerId;
    private String email;
    private String firstName;
    private String lastName;
    private String role;
    private Boolean isAdmin;
    private Boolean isDeliveryBoy;
}
