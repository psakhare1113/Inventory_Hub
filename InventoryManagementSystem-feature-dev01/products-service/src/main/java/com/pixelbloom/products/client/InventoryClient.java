package com.pixelbloom.products.client;

import com.pixelbloom.products.exception.InventoryServiceException;
import com.pixelbloom.products.model.SellCheckRequest;
import com.pixelbloom.products.model.SellCheckResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

    @Component
    @RequiredArgsConstructor
    public class InventoryClient {

        private final RestTemplate restTemplate;

        private final String INVENTORY_URL = "http://localhost:9093/api/inventory/sell-check";

        public SellCheckResponse checkSellable(SellCheckRequest request) {
            try {
                SellCheckResponse response = restTemplate.postForObject(INVENTORY_URL, request, SellCheckResponse.class);
                System.out.println("Inventory Response: " + response);
                return response;
            } catch (HttpClientErrorException.BadRequest ex) {
                throw new InventoryServiceException(ex.getResponseBodyAsString());
            }
        }

    }
