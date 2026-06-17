package com.pixelbloom.products.controller;

import com.pixelbloom.products.model.Pricing;
import com.pixelbloom.products.request.PricingUpdateRequest;
import com.pixelbloom.products.service.PricingService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class PricingController {

    private final PricingService pricingService;

    public PricingController(PricingService pricingService) {
        this.pricingService = pricingService;
    }

    @PostMapping("/addPrice")
    public Pricing addPrice(@RequestBody Pricing pricing) {
        return pricingService.addPrice(pricing);
    }

    @GetMapping("/pricing")
    public List<Pricing> getAllPricing() {
        return pricingService.getAllPricing();
    }

    @GetMapping("/priceByProductId")
    public Map<Long, Pricing> getPricing(@RequestParam List<Long> productIds) {
        return pricingService.getgivenProductIdsPricing(productIds);
    }

    @GetMapping("/priceByProductId/{productId}")
    public Pricing getPricing(@PathVariable Long productId) {
        return pricingService.getProductIdPricing(productId);
    }


    @PutMapping("/updatePrice/{productId}")
    public Pricing updatePrice(@PathVariable Long productId,@RequestBody PricingUpdateRequest pricing) {
        pricing.setProductId(productId);
        return pricingService.updatePrice(pricing);
    }

    @DeleteMapping("/pricing/{id}")
    public Map<String, Object> deletePricing(@PathVariable Long id) {
        try {
            pricingService.deletePricing(id);
            return Map.of("success", true, "message", "Pricing deleted successfully");
        } catch (Exception e) {
            return Map.of("success", false, "error", e.getMessage());
        }
    }

}