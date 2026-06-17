package com.pixelbloom.orders.responseEntity;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CustomerDetailsResponse {
        private Long customerId;
        private Long id;           // auth-service returns "id" not "customerId"
        private String firstName;
        private String lastName;
        private String customerEmail;
        private String email;      // auth-service returns "email" not "customerEmail"

        // Helper to get email from either field
        public String getResolvedEmail() {
            if (customerEmail != null && !customerEmail.isBlank()) return customerEmail;
            if (email != null && !email.isBlank()) return email;
            return null;
        }
}
