package com.pixelbloom.inventory.service;

import com.pixelbloom.inventory.model.Inventory;
import com.pixelbloom.inventory.model.InventoryWithProductDetails;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import lombok.extern.slf4j.Slf4j;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class ProductIntegrationService {
    
    private final RestTemplate restTemplate;
    
    @Value("${products.service.url:http://localhost:9094}")
    private String productsServiceUrl;
    
    public ProductIntegrationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    /**
     * Fetch product details by ID
     */
    public Map<String, Object> getProductDetails(Long productId) {
        try {
            String url = productsServiceUrl + "/api/products/getByProductId/" + productId;
            log.info("Fetching product details from: {}", url);
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            log.error("Error fetching product details for ID: {}", productId, e);
            return null;
        }
    }
    
    /**
     * Fetch category details by ID
     */
    public Map<String, Object> getCategoryDetails(Long categoryId) {
        try {
            String url = productsServiceUrl + "/api/categories/" + categoryId;
            log.info("Fetching category details from: {}", url);
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            log.error("Error fetching category details for ID: {}", categoryId, e);
            return null;
        }
    }
    
    /**
     * Fetch subcategory details by ID
     */
    public Map<String, Object> getSubcategoryDetails(Long subcategoryId) {
        try {
            String url = productsServiceUrl + "/api/subcategories/" + subcategoryId;
            log.info("Fetching subcategory details from: {}", url);
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            log.error("Error fetching subcategory details for ID: {}", subcategoryId, e);
            return null;
        }
    }
    
    /**
     * Fetch pricing details by product ID
     */
    public Map<String, Object> getPricingDetails(Long productId) {
        try {
            String url = productsServiceUrl + "/api/products/priceByProductId/" + productId;
            log.info("Fetching pricing details from: {}", url);
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            log.error("Error fetching pricing details for product ID: {}", productId, e);
            return null;
        }
    }
    
    /**
     * Validate if product exists and is active
     */
    public boolean validateProduct(Long productId) {
        try {
            Map<String, Object> product = getProductDetails(productId);
            return product != null && !"DISABLED".equals(product.get("status"));
        } catch (Exception e) {
            log.error("Error validating product ID: {}", productId, e);
            return false;
        }
    }
    
    /**
     * 🚀 AUTO-SYNC: Create or update pricing entry when inventory is created
     * This is called from InventoryServiceImpl.addInventory() to sync cost price
     */
    public void syncInventoryToPricing(Long productId, BigDecimal buyPrice) {
        try {
            log.info("🔄 Auto-syncing inventory to pricing: productId={}, buyPrice={}", productId, buyPrice);
            
            // Check if pricing already exists
            Map<String, Object> existingPricing = getPricingDetails(productId);
            
            if (existingPricing == null) {
                // Create new pricing entry
                createPricingEntry(productId, buyPrice);
            } else {
                // Update existing cost price if different
                BigDecimal currentCostPrice = convertToBigDecimal(existingPricing.get("costPrice"));
                if (currentCostPrice == null || currentCostPrice.compareTo(buyPrice) != 0) {
                    updateCostPrice(productId, buyPrice);
                }
            }
        } catch (Exception e) {
            log.error("❌ Failed to sync inventory to pricing for productId: {}", productId, e);
            // Don't throw exception - inventory creation should not fail due to pricing sync issues
        }
    }
    
    /**
     * Create new pricing entry with cost price from inventory
     */
    private void createPricingEntry(Long productId, BigDecimal buyPrice) {
        try {
            Map<String, Object> pricingData = new HashMap<>();
            pricingData.put("productId", productId);
            pricingData.put("costPrice", buyPrice);
            pricingData.put("sellingPrice", BigDecimal.ZERO); // Will be set by admin
            pricingData.put("mrp", BigDecimal.ZERO); // Will be set by admin
            pricingData.put("gstRate", BigDecimal.valueOf(18)); // Default GST
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(pricingData, headers);
            
            String createUrl = productsServiceUrl + "/api/products/addPrice";
            ResponseEntity<Map> response = restTemplate.postForEntity(createUrl, request, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Auto-created pricing entry for productId: {} with costPrice: {}", productId, buyPrice);
            } else {
                log.warn("⚠️ Failed to create pricing entry: HTTP {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("❌ Error creating pricing entry for productId: {}", productId, e);
        }
    }
    
    /**
     * Update existing cost price in pricing table
     */
    private void updateCostPrice(Long productId, BigDecimal buyPrice) {
        try {
            Map<String, Object> updateData = new HashMap<>();
            updateData.put("costPrice", buyPrice);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(updateData, headers);
            
            String updateUrl = productsServiceUrl + "/api/products/updatePrice/" + productId;
            ResponseEntity<Map> response = restTemplate.exchange(updateUrl, HttpMethod.PUT, request, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Auto-updated cost price for productId: {} to: {}", productId, buyPrice);
            } else {
                log.warn("⚠️ Failed to update cost price: HTTP {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("❌ Error updating cost price for productId: {}", productId, e);
        }
    }
    
    /**
     * Helper method to convert Object to BigDecimal
     */
    private BigDecimal convertToBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Double) return BigDecimal.valueOf((Double) value);
        if (value instanceof Integer) return BigDecimal.valueOf((Integer) value);
        if (value instanceof Long) return BigDecimal.valueOf((Long) value);
        if (value instanceof String) {
            try {
                return new BigDecimal((String) value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}