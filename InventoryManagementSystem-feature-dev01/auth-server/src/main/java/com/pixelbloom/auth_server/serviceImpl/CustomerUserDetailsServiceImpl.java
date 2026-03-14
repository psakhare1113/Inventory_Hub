package com.pixelbloom.auth_server.serviceImpl;

import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomerUserDetailsServiceImpl implements UserDetailsService  {
  @Autowired
   CustomerRepository customerRepository;

    /*public CustomerUserDetailsServiceImpl(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }*/

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() ->
                        new UsernameNotFoundException("User not found: " + email)
                );

        return User.builder()
                .username(customer.getEmail())
                .password(customer.getPassword())
                .authorities("ROLE_" + customer.getRole().name())
                .build();
    }
}