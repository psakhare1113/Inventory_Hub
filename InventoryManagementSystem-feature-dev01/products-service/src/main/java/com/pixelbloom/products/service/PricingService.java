package com.pixelbloom.products.service;

import com.pixelbloom.products.model.Pricing;
import com.pixelbloom.products.request.PricingUpdateRequest;

import java.util.List;
import java.util.Map;

public interface PricingService {
    Map<Long, Pricing> getPricing(List<Long> productIds);

    Pricing addPrice(Pricing pricing);

    List<Pricing> getAllPricing();

    Map<Long, Pricing> getgivenProductIdsPricing(List<Long> productIds);

   
    Pricing getProductIdPricing(Long productId);

    Pricing updatePrice(PricingUpdateRequest pricing);

    void deletePricing(Long id);
}
