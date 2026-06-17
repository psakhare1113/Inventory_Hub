package com.pixelbloom.auth_server.serviceImpl;

import com.pixelbloom.auth_server.dto.AuditStaff;
import com.pixelbloom.auth_server.dto.DeliveryBoy;
import com.pixelbloom.auth_server.dto.WarehouseStaff;
import com.pixelbloom.auth_server.model.Customer;
import com.pixelbloom.auth_server.repository.AuditStaffRepository;
import com.pixelbloom.auth_server.repository.CustomerRepository;
import com.pixelbloom.auth_server.repository.DeliveryBoyRepository;
import com.pixelbloom.auth_server.repository.WarehouseStaffRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomerUserDetailsServiceImpl implements UserDetailsService {

    @Autowired
    CustomerRepository customerRepository;

    @Autowired
    WarehouseStaffRepository warehouseStaffRepository;

    @Autowired
    DeliveryBoyRepository deliveryBoyRepository;

    @Autowired
    AuditStaffRepository auditStaffRepository;

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        // 1. Search in customers table
        Optional<Customer> customerOpt = customerRepository.findByEmail(email);
        if (customerOpt.isPresent()) {
            Customer customer = customerOpt.get();
            return User.builder()
                    .username(customer.getEmail())
                    .password(customer.getPassword())
                    .authorities("ROLE_USER")
                    .build();
        }

        // 2. Search in delivery_boys table
        Optional<DeliveryBoy> deliveryBoyOpt = deliveryBoyRepository.findByEmail(email);
        if (deliveryBoyOpt.isPresent()) {
            DeliveryBoy db = deliveryBoyOpt.get();
            return User.builder()
                    .username(db.getEmail())
                    .password(db.getPassword())
                    .authorities("ROLE_DELIVERY_BOY")
                    .build();
        }

        // 3. Search in warehouse_staff table (warehouse staff only)
        Optional<WarehouseStaff> staffOpt = warehouseStaffRepository.findByEmail(email);
        if (staffOpt.isPresent()) {
            WarehouseStaff staff = staffOpt.get();
            return User.builder()
                    .username(staff.getEmail())
                    .password(staff.getPassword())
                    .authorities("ROLE_" + staff.getRole())
                    .build();
        }

        // 4. Search in audit_staff table (AUDITOR / VIEWER)
        Optional<AuditStaff> auditOpt = auditStaffRepository.findByEmail(email);
        if (auditOpt.isPresent()) {
            AuditStaff audit = auditOpt.get();
            return User.builder()
                    .username(audit.getEmail())
                    .password(audit.getPassword())
                    .authorities("ROLE_" + audit.getRole())
                    .build();
        }

        throw new UsernameNotFoundException("User not found: " + email);
    }
}