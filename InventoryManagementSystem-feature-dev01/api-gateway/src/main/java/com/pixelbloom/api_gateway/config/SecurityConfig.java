package com.pixelbloom.api_gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {
/*
This configuration:Disables CSRF protection ,Allows unauthenticated access to /api/auth/** endpoints
Requires authentication for all other endpoints */
  /*  @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers("/api/auth/register", "/api/auth/login", "/api/auth/token","/api/auth/createAdmin").permitAll()
                        .anyExchange().authenticated()
                )
                .build();
    }*/

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers("/api/auth/register", "/api/auth/login", "/api/auth/token", "/api/auth/createAdmin").permitAll()
                        .pathMatchers("/api/products/**", "/api/categories/**", "/api/subcategories/**", "/api/pricing/**", "/api/images/**").permitAll()
                        .anyExchange().permitAll()
                )
                .build();
    }

}