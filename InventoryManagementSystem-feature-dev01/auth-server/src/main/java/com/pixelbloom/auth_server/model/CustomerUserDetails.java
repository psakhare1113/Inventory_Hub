package com.pixelbloom.auth_server.model;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;


public class CustomerUserDetails implements UserDetails {
    private String email;
    private String password;

    public CustomerUserDetails(Customer customer) {
        this.email = customer.getEmail();
        this.password = customer.getPassword();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return "";
    }

}
