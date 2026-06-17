package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.model.Pricing;
import com.pixelbloom.products.repository.PricingRepository;
import com.pixelbloom.products.request.PricingUpdateRequest;
import com.pixelbloom.products.service.PricingService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
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

    private BigDecimal calculateDiscount(BigDecimal mrp, BigDecimal sellingPrice) {
        if (mrp == null || sellingPrice == null || mrp.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return mrp.subtract(sellingPrice)
                  .divide(mrp, 4, RoundingMode.HALF_UP)
                  .multiply(BigDecimal.valueOf(100))
                  .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Calculate selling price from components:
     * sellingPrice = costPrice + packagingCost + shippingCost + profitMargin + GST(on costPrice)
     * GST is applied on costPrice only (common Indian practice for B2B pricing).
     */
    private BigDecimal calculateSellingPrice(BigDecimal costPrice,
                                              BigDecimal packagingCost,
                                              BigDecimal shippingCost,
                                              BigDecimal profitMargin,
                                              BigDecimal gstRate) {
        BigDecimal cp   = costPrice     != null ? costPrice     : BigDecimal.ZERO;
        BigDecimal pkg  = packagingCost != null ? packagingCost : BigDecimal.ZERO;
        BigDecimal ship = shippingCost  != null ? shippingCost  : BigDecimal.ZERO;
        BigDecimal pm   = profitMargin  != null ? profitMargin  : BigDecimal.ZERO;
        BigDecimal gst  = gstRate       != null ? gstRate       : BigDecimal.valueOf(18);

        // GST amount on cost price
        BigDecimal gstAmount = cp.multiply(gst).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        return cp.add(pkg).add(ship).add(pm).add(gstAmount).setScale(2, RoundingMode.HALF_UP);
    }

    @Override
    public Pricing addPrice(Pricing pricing) {
        // Auto-calculate sellingPrice if components are provided and sellingPrice not explicitly set
        if (pricing.getCostPrice() != null
                && (pricing.getSellingPrice() == null || pricing.getSellingPrice().compareTo(BigDecimal.ZERO) == 0)) {
            BigDecimal computed = calculateSellingPrice(
                    pricing.getCostPrice(),
                    pricing.getPackagingCost(),
                    pricing.getShippingCost(),
                    pricing.getProfitMargin(),
                    pricing.getGstRate()
            );
            pricing.setSellingPrice(computed);
        }
        pricing.setDiscount(calculateDiscount(pricing.getMrp(), pricing.getSellingPrice()));
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
            // Map new cost breakdown fields
            if (pricing.getCostPrice()     != null) p.setCostPrice(pricing.getCostPrice());
            if (pricing.getPackagingCost() != null) p.setPackagingCost(pricing.getPackagingCost());
            if (pricing.getShippingCost()  != null) p.setShippingCost(pricing.getShippingCost());
            if (pricing.getProfitMargin()  != null) p.setProfitMargin(pricing.getProfitMargin());
            if (pricing.getGstRate()       != null) p.setGstRate(pricing.getGstRate());
            p.setUnitSize(pricing.getUnitSize());
            p.setUnitLabel(pricing.getUnitLabel());

            // Auto-calculate sellingPrice from components if provided, else use explicit value
            if (pricing.getCostPrice() != null
                    && (pricing.getSellingPrice() == null || pricing.getSellingPrice().compareTo(BigDecimal.ZERO) == 0)) {
                BigDecimal computed = calculateSellingPrice(
                        p.getCostPrice(), p.getPackagingCost(),
                        p.getShippingCost(), p.getProfitMargin(), p.getGstRate()
                );
                p.setSellingPrice(computed);
            } else if (pricing.getSellingPrice() != null) {
                p.setSellingPrice(pricing.getSellingPrice());
            }

            p.setDiscount(calculateDiscount(p.getMrp(), p.getSellingPrice()));
            return p;
        }).collect(Collectors.toList());

        pricingRepository.saveAll(pricingrepoResponse);
        return pricingrepoResponse.get(0); // Return the first updated pricing
    }

    @Override
    public void deletePricing(Long id) {
        if (pricingRepository.existsById(id)) {
            pricingRepository.deleteById(id);
        } else {
            throw new RuntimeException("Pricing with ID " + id + " not found");
        }
    }

}