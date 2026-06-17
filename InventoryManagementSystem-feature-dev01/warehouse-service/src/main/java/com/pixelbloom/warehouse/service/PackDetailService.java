package com.pixelbloom.warehouse.service;

import com.pixelbloom.warehouse.model.PackDetail;
import com.pixelbloom.warehouse.model.PickList;
import com.pixelbloom.warehouse.repository.PackDetailRepository;
import com.pixelbloom.warehouse.repository.PickListRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Pack Detail Service
 *
 * Handles saving and retrieving packing details submitted by Packer.
 * Each PickList has at most one PackDetail (upsert — create or update).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PackDetailService {

    private final PackDetailRepository packDetailRepository;
    private final PickListRepository   pickListRepository;
    private final WarehouseEventPublisher eventPublisher;
    private final RestTemplate restTemplate;

    @Value("${orders.service.url:http://localhost:9091}")
    private String ordersServiceUrl;

    /**
     * Save (create or update) pack details for a pick list.
     * Called by Packer when they submit the Pack Details form.
     *
     * @param pickListId    ID of the pick list being packed
     * @param body          map with: boxSize, packagingType, weight, dimensions, notes, packedBy, packedById
     * @return saved PackDetail
     */
    @Transactional
    public PackDetail savePackDetail(Long pickListId, Map<String, Object> body) {
        // Resolve pick list for orderNumber + customerId
        PickList pickList = pickListRepository.findById(pickListId)
                .orElseThrow(() -> new RuntimeException("Pick list not found: " + pickListId));

        // Upsert — update if already exists
        PackDetail pd = packDetailRepository.findByPickListId(pickListId)
                .orElse(PackDetail.builder()
                        .pickListId(pickListId)
                        .orderNumber(pickList.getOrderNumber())
                        .customerId(pickList.getCustomerId())
                        .build());

        // Map fields from request body
        if (body.containsKey("boxSize"))       pd.setBoxSize(str(body.get("boxSize")));
        if (body.containsKey("packagingType")) pd.setPackagingType(str(body.get("packagingType")));
        if (body.containsKey("weight"))        pd.setWeight(toDouble(body.get("weight")));
        if (body.containsKey("dimensions"))    pd.setDimensions(str(body.get("dimensions")));
        if (body.containsKey("notes"))         pd.setNotes(str(body.get("notes")));
        if (body.containsKey("packedBy"))      pd.setPackedBy(str(body.get("packedBy")));
        if (body.containsKey("packedById"))    pd.setPackedById(toLong(body.get("packedById")));

        pd.setPackedAt(LocalDateTime.now());

        PackDetail saved = packDetailRepository.save(pd);
        log.info("✅ PackDetail saved — pickListId: {}, order: {}, box: {}, type: {}, weight: {}kg, by: {}",
                pickListId, pickList.getOrderNumber(),
                pd.getBoxSize(), pd.getPackagingType(), pd.getWeight(), pd.getPackedBy());

        // ✅ Update order status to PACKED in orders-service
        updateOrderStatusToPacked(pickList.getOrderNumber());

        // 🔔 WebSocket — Admin ला ORDER_PACKED notification
        Map<String, Object> packData = new HashMap<>();
        packData.put("pickListId", pickListId);
        packData.put("orderNumber", pickList.getOrderNumber());
        packData.put("packedBy", pd.getPackedBy());
        packData.put("boxSize", pd.getBoxSize());
        packData.put("weight", pd.getWeight());
        eventPublisher.notifyAdmin("ORDER_PACKED",
                "📦 Order Packed: #" + pickList.getOrderNumber(),
                "Packed by " + pd.getPackedBy() + ". Box: " + pd.getBoxSize() + ", " + pd.getWeight() + "kg",
                packData);

        // 🔔 WebSocket — Shipping ला instant alert
        // NOTE: broadcastToWarehouse काढला — Packer ला double ORDER_PACKED येत होती
        // (/topic/warehouse/all subscribe करतो PackerDashboard, त्यामुळे frontend notifyOrderPacked()
        // + backend broadcast = double push). Shipping ला direct notify पुरे.
        eventPublisher.notifyShipping("ORDER_PACKED",
                "📦 Ready to Ship: #" + pickList.getOrderNumber(),
                "Order packed by " + pd.getPackedBy() + ". Assign carrier and AWB.",
                packData);

        // 🔔 WebSocket — Warehouse Manager ला update (packer ला नाही — double push टाळण्यासाठी)
        eventPublisher.notifyAllManagers("ORDER_PACKED",
                "📦 Order Packed: #" + pickList.getOrderNumber(),
                "Order " + pickList.getOrderNumber() + " packed by " + pd.getPackedBy(),
                packData);

        return saved;
    }

    /**
     * Get pack detail by pick list ID
     */
    public Optional<PackDetail> getByPickListId(Long pickListId) {
        return packDetailRepository.findByPickListId(pickListId);
    }

    /**
     * Get pack detail by order number
     */
    public Optional<PackDetail> getByOrderNumber(String orderNumber) {
        return packDetailRepository.findByOrderNumber(orderNumber);
    }

    /**
     * Update shipping info on an existing pack detail (called when order is shipped).
     * Creates a minimal PackDetail record if one doesn't exist yet.
     */
    @Transactional
    public PackDetail updateShippingInfo(String orderNumber, Map<String, Object> body) {
        // Find existing or create minimal record
        PackDetail pd = packDetailRepository.findByOrderNumber(orderNumber)
                .orElseGet(() -> {
                    // Try to find pick list for this order
                    com.pixelbloom.warehouse.model.PickList pl =
                            pickListRepository.findByOrderNumber(orderNumber).orElse(null);
                    return PackDetail.builder()
                            .orderNumber(orderNumber)
                            .pickListId(pl != null ? pl.getId() : null)
                            .customerId(pl != null ? pl.getCustomerId() : null)
                            .build();
                });

        if (body.containsKey("carrier"))       pd.setCarrier(str(body.get("carrier")));
        if (body.containsKey("trackingNumber")) pd.setTrackingNumber(str(body.get("trackingNumber")));
        if (body.containsKey("shippingCost"))  pd.setShippingCost(toDouble(body.get("shippingCost")));
        pd.setShippedAt(LocalDateTime.now());

        PackDetail saved = packDetailRepository.save(pd);
        log.info("✅ Shipping info updated on PackDetail — order: {}, carrier: {}, AWB: {}",
                orderNumber, pd.getCarrier(), pd.getTrackingNumber());
        return saved;
    }

    /**
     * Get all pack details (admin/manager view)
     */
    public List<PackDetail> getAll() {
        return packDetailRepository.findAll();
    }

    /**
     * Get all pack details submitted by a specific packer
     */
    public List<PackDetail> getByPackerId(Long packerId) {
        return packDetailRepository.findByPackedById(packerId);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String str(Object val) {
        return val != null ? val.toString().trim() : null;
    }

    private Double toDouble(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return null; }
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return null; }
    }

    /**
     * Call orders-service to advance order status to PACKED.
     * Non-fatal — pack details are still saved even if this call fails.
     */
    private void updateOrderStatusToPacked(String orderNumber) {
        if (orderNumber == null) return;
        try {
            String url = ordersServiceUrl + "/api/auth/admin/orders/" + orderNumber + "/status?status=PACKED";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>("", headers);
            var res = restTemplate.exchange(url, HttpMethod.PATCH, entity, Object.class);
            log.info("✅ Order {} advanced to PACKED — orders-service responded: {}", orderNumber, res.getStatusCode());
        } catch (Exception e) {
            log.warn("⚠️ Could not advance order {} to PACKED in orders-service (non-fatal): {}", orderNumber, e.getMessage());
        }
    }
}
