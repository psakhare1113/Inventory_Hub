package com.pixelbloom.auth_server.service;

import org.springframework.security.core.userdetails.UserDetails;

public interface CustomerUserDetailsService {
    UserDetails loadUserByUsername(String email);
}