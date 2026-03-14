/*
package com.pixelbloom.shipping.clients;

import com.pixelbloom.shipping.dto.CustomerDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class CustomerClient {
    private final RestTemplate restTemplate;

    @Value("${customer.service.url}")
    private String customerServiceUrl;

    public CustomerDTO getCustomerById(Long customerId) {
        return restTemplate.getForObject(
                customerServiceUrl + "/api/customers/" + customerId,
                CustomerDTO.class
        );
    }
}
*/
