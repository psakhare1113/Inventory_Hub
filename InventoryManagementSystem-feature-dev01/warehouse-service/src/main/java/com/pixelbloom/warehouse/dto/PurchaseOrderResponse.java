package com.pixelbloom.warehouse.dto;

import com.pixelbloom.warehouse.enums.POStatus;
import com.pixelbloom.warehouse.model.PurchaseOrder;
import com.pixelbloom.warehouse.model.PurchaseOrderLine;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * PO response that includes supplier name (fetched from products-service).
 * The raw PurchaseOrder entity only stores supplierId.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseOrderResponse {

    private Long id;
    private String poNumber;

    // Supplier info
    private Long supplierId;
    private String supplierName;    // fetched from products-service
    private String supplierCompany; // fetched from products-service
    private String supplierPhone;   // fetched from products-service

    private Long warehouseId;
    private POStatus status;
    private LocalDate expectedDate;
    private BigDecimal totalAmount;
    private String currency;
    private String creditTerms;
    private String shipToAddress;
    private Boolean receiveMaterials;
    private LocalDate poDate;
    private String notes;
    private String termsAndConditions;

    private Long approvedBy;
    private LocalDateTime approvedAt;
    private String approvedByRole;   // Role of approver: ADMIN / FINANCE_TEAM
    private String requestedByRole;  // Role of creator: WAREHOUSE_MANAGER / PROCUREMENT / INVENTORY_MANAGER / ADMIN
    private LocalDateTime firstReceivedAt;
    private LocalDateTime fullyReceivedAt;

    private List<LineDto> lines;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Long createdBy;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineDto {
        private Long id;
        private Long productId;
        private String productName;
        private String sku;
        private Integer qtyOrdered;
        private Integer qtyReceived;
        private BigDecimal unitPrice;
        private String notes;
    }

    // ── Factory ───────────────────────────────────────────────────────────────

    public static PurchaseOrderResponse from(PurchaseOrder po,
                                             String supplierName,
                                             String supplierCompany,
                                             String supplierPhone) {
        List<LineDto> lineDtos = po.getLines() == null ? List.of() :
                po.getLines().stream().map(l -> LineDto.builder()
                        .id(l.getId())
                        .productId(l.getProductId())
                        .productName(l.getProductName())
                        .sku(l.getSku())
                        .qtyOrdered(l.getQtyOrdered())
                        .qtyReceived(l.getQtyReceived())
                        .unitPrice(l.getUnitPrice())
                        .notes(l.getNotes())
                        .build()
                ).collect(Collectors.toList());

        return PurchaseOrderResponse.builder()
                .id(po.getId())
                .poNumber(po.getPoNumber())
                .supplierId(po.getSupplierId())
                .supplierName(supplierName)
                .supplierCompany(supplierCompany)
                .supplierPhone(supplierPhone)
                .warehouseId(po.getWarehouseId())
                .status(po.getStatus())
                .expectedDate(po.getExpectedDate())
                .totalAmount(po.getTotalAmount())
                .currency(po.getCurrency())
                .creditTerms(po.getCreditTerms())
                .shipToAddress(po.getShipToAddress())
                .receiveMaterials(po.getReceiveMaterials())
                .poDate(po.getPoDate())
                .notes(po.getNotes())
                .termsAndConditions(po.getTermsAndConditions())
                .approvedBy(po.getApprovedBy())
                .approvedAt(po.getApprovedAt())
                .approvedByRole(po.getApprovedByRole())
                .requestedByRole(po.getRequestedByRole())
                .firstReceivedAt(po.getFirstReceivedAt())
                .fullyReceivedAt(po.getFullyReceivedAt())
                .lines(lineDtos)
                .createdAt(po.getCreatedAt())
                .updatedAt(po.getUpdatedAt())
                .createdBy(po.getCreatedBy())
                .build();
    }
}
