package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.model.Pricing;
import com.pixelbloom.products.repository.PricingRepository;
import com.pixelbloom.products.request.PricingUpdateRequest;
import com.pixelbloom.products.service.PricingService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PricingServiceImpl implements PricingService {

    private final PricingRepository pricingRepository;

    public PricingServiceImpl(PricingRepository pricingRepository) {
        this.pricingRepository = pricingRepository;
    }

    @Override
    public Map<Long, Pricing> getPricing(List<Long> productIds) {

        return pricingRepository.findByProductIdIn(productIds)
                .stream()
                .collect(Collectors.toMap(
                        Pricing::getProductId,
                        p -> p
                ));
    }

    @Override
    public Pricing addPrice(Pricing pricing) {
        return pricingRepository.save(pricing);
    }

    @Override
    public List<Pricing> getAllPricing() {
        return pricingRepository.findAll();
    }

    @Override
    public Map<Long, Pricing> getgivenProductIdsPricing(List<Long> productIds) {
       return pricingRepository.findByProductIdIn(productIds)
                .stream()
                .collect(Collectors.toMap(
                        Pricing::getProductId,
                        p -> p
                ));
           }


    @Override
    public Pricing getProductIdPricing(Long productId) {
        List<Pricing> pricingList = pricingRepository.findByProductIdIn(List.of(productId));
        if (!pricingList.isEmpty()) {
            return pricingList.get(0);
        }
        return null;
    }

    @Override
    public Pricing updatePrice(PricingUpdateRequest pricing) {
        List<Pricing> pricingrepoResponse = pricingRepository.findByProductId(pricing.getProductId());

        if (pricingrepoResponse.isEmpty()) {
            return null; // or throw exception if product pricing doesn't exist
        }

        pricingrepoResponse = pricingrepoResponse.stream().map(p -> {
            p.setMrp(pricing.getMrp());
            p.setSellingPrice(pricing.getSellingPrice());
            p.setUnitSize(pricing.getUnitSize());
            p.setUnitLabel(pricing.getUnitLabel());
            return p;
        }).collect(Collectors.toList());

        pricingRepository.saveAll(pricingrepoResponse);
        return pricingrepoResponse.get(0); // Return the first updated pricing
    }

}