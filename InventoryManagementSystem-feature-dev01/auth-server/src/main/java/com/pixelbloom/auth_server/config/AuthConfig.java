package com.pixelbloom.auth_server.config;

import com.pixelbloom.auth_server.serviceImpl.CustomerUserDetailsServiceImpl;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class AuthConfig {

    private final CustomerUserDetailsServiceImpl customerUserDetailsService;
    private final CorsConfigurationSource corsConfigurationSource;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    public AuthConfig(CustomerUserDetailsServiceImpl customerUserDetailsService,
                      CorsConfigurationSource corsConfigurationSource,
                      OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler) {
        this.customerUserDetailsService = customerUserDetailsService;
        this.corsConfigurationSource = corsConfigurationSource;
        this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return customerUserDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            // OAuth2 login requires a session to store the state/nonce during the redirect flow.
            // We use IF_REQUIRED so Spring can create a short-lived session for the OAuth2 handshake,
            // while all our REST API endpoints remain stateless (JWT-based).
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .httpBasic(basic -> basic.disable())
            .formLogin(form -> form.disable())
            .authorizeHttpRequests(auth -> auth
                // Allow all REST API endpoints and the OAuth2 redirect callback
                .requestMatchers("/api/auth/**", "/login/oauth2/**", "/oauth2/**").permitAll()
                .anyRequest().permitAll()
            )
            // ── OAuth2 Social Login ──────────────────────────────────────────
            .oauth2Login(oauth2 -> oauth2
                // Spring Boot auto-configures the authorization endpoint at /oauth2/authorization/{registrationId}
                // e.g. GET http://localhost:2000/oauth2/authorization/google  → redirects to Google
                .successHandler(oAuth2LoginSuccessHandler)
                .failureUrl("/api/auth/oauth2/failure")
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authenticationProvider = new DaoAuthenticationProvider();
        authenticationProvider.setUserDetailsService(customerUserDetailsService);
        authenticationProvider.setPasswordEncoder(passwordEncoder());
        return authenticationProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}