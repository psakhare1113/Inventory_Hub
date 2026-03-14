package com.pixelbloom.orders.service;

import com.pixelbloom.orders.model.Pricing;

import java.util.Optional;

public interface PricingService {
    Pricing addPricing(Pricing pricing);
    Optional<Pricing> getLatestPriceByProductId(Long productId);
}