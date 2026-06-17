package com.pixelbloom.warehouse.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * REST client to call email-service for warehouse notifications.
 *
 * PO Approved → email goes only to Receiving Clerk (not to Warehouse Manager)
 * Notify Team → email goes only to Receiving Clerk
 */
@Component
@Slf4j
public class EmailNotificationClient {

    private final RestTemplate restTemplate;

    @Value("${email.service.url:http://localhost:9098}")
    private String emailServiceUrl;

    // ⚠️ This email is no longer used — kept only for backward compatibility
    @Value("${warehouse.manager.email:psakhare1113@gmail.com}")
    private String warehouseManagerEmail;

    // ✅ When PO is Approved, email goes only to Receiving Clerk
    @Value("${receiving.clerk.email:psakhare1113@gmail.com}")
    private String receivingClerkEmail;

    public EmailNotificationClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * PO Approved — email only to Receiving Clerk.
     * Called automatically when Admin/Finance approves the PO.
     * Warehouse Manager ला email जात नाही — त्यांना need नाही.
     */
    public void sendPoApprovedNotification(String poNumber,
                                           String supplierName,
                                           String expectedDate,
                                           String totalAmount,
                                           int totalItems) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("to",           receivingClerkEmail);   // ← Receiving Clerk, NOT Manager
            payload.put("poNumber",     poNumber);
            payload.put("supplierName", supplierName);
            payload.put("expectedDate", expectedDate);
            payload.put("itemsList",    totalItems + " line item(s)");
            payload.put("totalAmount",  totalAmount);
            payload.put("managerNote",  "PO has been approved. Please prepare to receive incoming stock.");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            // ReceivingAlert template वापरतो — PO Approved template नाही
            ResponseEntity<String> response = restTemplate.postForEntity(
                    emailServiceUrl + "/api/email/receiving-alert",
                    request,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ PO Approved email sent to Receiving Clerk ({}) for PO: {}",
                        receivingClerkEmail, poNumber);
            } else {
                log.warn("⚠️ Email service returned non-2xx for PO: {} — status: {}",
                        poNumber, response.getStatusCode());
            }

        } catch (Exception e) {
            // Email failure should NOT block PO approval — just log it
            log.error("❌ Failed to send PO Approved email for PO: {} — {}", poNumber, e.getMessage());
        }
    }

    /**
     * Inventory Updated — Admin ला email + notification.
     * Receiving Clerk ने putaway complete केल्यावर inventory add होतो तेव्हा call होतो.
     * फक्त Admin ला — बाकी कोणाला नाही.
     */
    public void sendInventoryUpdatedEmail(String adminEmail,
                                          String productName,
                                          Long   productId,
                                          int    qtyAdded,
                                          String grnNumber,
                                          Long   warehouseId,
                                          String condition) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("to",          adminEmail);
            payload.put("productName", productName != null ? productName : "Product #" + productId);
            payload.put("productId",   productId);
            payload.put("qtyAdded",    qtyAdded);
            payload.put("grnNumber",   grnNumber);
            payload.put("warehouseId", warehouseId);
            payload.put("condition",   condition != null ? condition : "GOOD");
            payload.put("updatedAt",   java.time.LocalDateTime.now()
                                           .toString().replace("T", " ").substring(0, 19));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    emailServiceUrl + "/api/email/inventory-updated",
                    request,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Inventory updated email sent to Admin ({}) — product={}, qty=+{}",
                        adminEmail, productId, qtyAdded);
            } else {
                log.warn("⚠️ Email service returned non-2xx for inventory update — product={}", productId);
            }

        } catch (Exception e) {
            log.error("❌ Failed to send inventory updated email — product={}: {}", productId, e.getMessage());
        }
    }

    /**
     * Notify Receiving Clerk — Warehouse Manager "📢 Notify Receiving" button दाबल्यावर.
     * फक्त Receiving Clerk ला email जातो — बाकी कोणाला नाही.
     */
    public void sendReceivingAlertEmail(String toEmail,
                                        String poNumber,
                                        String supplierName,
                                        String expectedDate,
                                        String itemsList,
                                        String totalAmount,
                                        String managerNote) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("to",           toEmail);
            payload.put("poNumber",     poNumber);
            payload.put("supplierName", supplierName);
            payload.put("expectedDate", expectedDate);
            payload.put("itemsList",    itemsList);
            payload.put("totalAmount",  totalAmount);
            payload.put("managerNote",  managerNote != null ? managerNote
                                        : "Please allocate space and prepare for receiving.");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    emailServiceUrl + "/api/email/receiving-alert",
                    request,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Receiving alert email sent to Receiving Clerk ({}) for PO: {}",
                        toEmail, poNumber);
            } else {
                log.warn("⚠️ Email service returned non-2xx for receiving alert PO: {} — status: {}",
                        poNumber, response.getStatusCode());
            }

        } catch (Exception e) {
            log.error("❌ Failed to send receiving alert email for PO: {} — {}", poNumber, e.getMessage());
        }
    }
}
