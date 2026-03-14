package com.pixelbloom.auth_server.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String password;
}
