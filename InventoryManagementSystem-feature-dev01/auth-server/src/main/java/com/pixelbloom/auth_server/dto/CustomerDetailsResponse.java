package com.pixelbloom.auth_server.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CustomerDetailsResponse {
        private Long customerId;
        private String firstName;
        private String lastName;
        private String email;
        private String phoneNumber;
}
