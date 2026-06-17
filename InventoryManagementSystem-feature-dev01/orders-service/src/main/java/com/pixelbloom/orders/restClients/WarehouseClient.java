package com.pixelbloom.orders.restClients;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * HTTP client to call warehouse-service from orders-service.
 *
 * Used to:
 *   1. Notify warehouse manager of a new CONFIRMED order (auto-creates pick list + WebSocket notification)
 *   2. Create pick lists directly (legacy — kept for backward compatibility)
 *
 * New Flow (order placed → warehouse manager notified directly):
 *   Customer places order → CONFIRMED
 *     → OrderServiceImpl.finalizeOrder()
 *     → WarehouseClient.notifyNewOrder()
 *     → POST http://warehouse-service:8088/api/warehouse/orders/new
 *     → PickListController creates PickList + notifies all WAREHOUSE_MANAGERs via WebSocket
 *     → Manager assigns Picker → flow continues
 */
@Component
@Slf4j
public class WarehouseClient {

    private final RestTemplate restTemplate;
    private final String warehouseServiceUrl;

    public WarehouseClient(RestTemplate restTemplate,
                           @Value("${warehouse.service.url:http://localhost:8088}") String warehouseServiceUrl) {
        this.restTemplate = restTemplate;
        this.warehouseServiceUrl = warehouseServiceUrl;
    }

    public String getWarehouseServiceUrl() {
        return warehouseServiceUrl;
    }

    /**
     * Fetch the first active warehouse from warehouse-service.
     * Returns a map with keys: id, name, city — or null if none found.
     */
    @SuppressWarnings("unchecked")
    public java.util.Map<String, Object> getFirstActiveWarehouse() {
        try {
            String url = warehouseServiceUrl + "/api/warehouse/warehouses/active";
            java.util.List<java.util.Map<String, Object>> list =
                    restTemplate.getForObject(url, java.util.List.class);
            if (list != null && !list.isEmpty()) {
                return list.get(0);
            }
        } catch (Exception e) {
            log.warn("Could not fetch active warehouses: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Notify warehouse-service of a new CONFIRMED order.
     * Called from finalizeOrder() right after warehouse assignment.
     *
     * This triggers:
     *   1. Auto-creation of PickList + PickListLine records (status: PENDING)
     *   2. WebSocket broadcast to ALL warehouse managers → instant dashboard notification
     *   3. Order status auto-advances to PROCESSING in orders-service
     *
     * @param orderNumber   order number
     * @param customerId    customer ID
     * @param warehouseId   assigned warehouse ID
     * @param warehouseName assigned warehouse name
     * @param deliveryPincode customer delivery pincode
     * @param deliverySpeed   STANDARD / EXPRESS / SAME_DAY
     * @param items         list of order items with productId, productName, barcode, quantity
     */
    public void notifyNewOrder(String orderNumber, Long customerId,
                               Long warehouseId, String warehouseName,
                               String deliveryPincode, String deliverySpeed,
                               List<Map<String, Object>> items) {
        try {
            String url = warehouseServiceUrl + "/api/warehouse/orders/new";

            Map<String, Object> body = new HashMap<>();
            body.put("orderNumber", orderNumber);
            body.put("customerId", customerId);
            body.put("warehouseId", warehouseId);
            body.put("warehouseName", warehouseName);
            body.put("deliveryPincode", deliveryPincode);
            body.put("deliverySpeed", deliverySpeed);
            body.put("items", items);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Object> response = restTemplate.postForEntity(url, request, Object.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Warehouse manager notified for new order: {}", orderNumber);
            } else {
                log.warn("⚠️ Warehouse-service returned {} for new order notification: {}", response.getStatusCode(), orderNumber);
            }
        } catch (Exception e) {
            // Non-fatal — order is already CONFIRMED; warehouse notification failure should not block
            log.warn("⚠️ Could not notify warehouse for new order {} (non-fatal): {}", orderNumber, e.getMessage());
        }
    }

    /**
     * Create a pick list in warehouse-service for the given order.
     * Legacy method — kept for backward compatibility.
     * Prefer notifyNewOrder() for new orders.
     *
     * @param orderNumber  order number
     * @param customerId   customer ID
     * @param items        list of order items with productId, barcode, quantity
     */
    public void createPickList(String orderNumber, Long customerId, List<Map<String, Object>> items) {
        try {
            String url = warehouseServiceUrl + "/api/warehouse/pick-lists/create";

            Map<String, Object> body = new HashMap<>();
            body.put("orderNumber", orderNumber);
            body.put("customerId", customerId);
            body.put("items", items);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            ResponseEntity<Object> response = restTemplate.postForEntity(url, request, Object.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Pick list created in warehouse-service for order: {}", orderNumber);
            } else {
                log.warn("⚠️ Warehouse-service returned {} for pick list creation: {}", response.getStatusCode(), orderNumber);
            }
        } catch (Exception e) {
            // Pick list creation failure must NOT block order status update
            log.error("❌ Failed to create pick list for order {}: {}", orderNumber, e.getMessage());
        }
    }
}
