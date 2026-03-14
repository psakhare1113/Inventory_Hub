package com.pixelbloom.orders.serviceImpl;

import com.pixelbloom.orders.model.Pricing;
import com.pixelbloom.orders.repository.PricingRepository;
import com.pixelbloom.orders.service.PricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PricingServiceImpl implements PricingService {

    private final PricingRepository pricingRepository;

    @Override
    public Pricing addPricing(Pricing pricing) {
        return pricingRepository.save(pricing);
    }

    @Override
    public Optional<Pricing> getLatestPriceByProductId(Long productId) {
        return pricingRepository.findTopByProductIdOrderByEffectiveDateDesc(productId);
    }
}