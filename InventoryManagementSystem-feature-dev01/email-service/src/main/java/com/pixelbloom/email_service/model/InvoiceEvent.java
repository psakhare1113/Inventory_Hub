package com.pixelbloom.email_service.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceEvent {
    private String orderNumber;
    private String invoiceNumber;
    private LocalDateTime orderDate;
    private LocalDateTime invoiceDate;
    private Long customerId;
    private String email;
    private String sellerName;
    private String sellerAddress;
    private String sellerGstin;
    private String sellerPan;
    private String billingName;
    private String billingAddress;
    private String billingStateCode;
    private String shippingName;
    private String shippingAddress;
    private String shippingStateCode;
    private String shippingBarcode;
    private String invoiceDetails;
    private String placeOfSupply;
    private String placeOfDelivery;
    private List<InvoiceItem> items;
    private BigDecimal subTotal;
    private BigDecimal cgst;
    private BigDecimal sgst;
    private BigDecimal igst;
    private BigDecimal grandTotal;
    private String paymentTxnId;
    private LocalDateTime paymentDateTime;
    private BigDecimal invoiceValue;
    private String paymentMode;
}