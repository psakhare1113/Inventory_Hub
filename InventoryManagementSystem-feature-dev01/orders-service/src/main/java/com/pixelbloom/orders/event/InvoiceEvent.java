package com.pixelbloom.orders.event;
import com.pixelbloom.orders.model.InvoiceItem;
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

    // Customer Info
    private Long customerId;
    private String email;


    // Seller
    private String sellerName;
    private String sellerAddress;
    private String sellerGstin;
    private String sellerPan;

    // Billing
    private String billingName;
    private String billingAddress;
    private String billingStateCode;

    // Shipping
    private String shippingName;
    private String shippingAddress;
    private String shippingStateCode;
    private String shippingBarcode;

    // Invoice Details
    private String invoiceDetails;
    private String placeOfSupply;
    private String placeOfDelivery;

    // Items
    private List<InvoiceItem> items;

    // Totals
    private BigDecimal subTotal;
    private BigDecimal cgst;
    private BigDecimal sgst;
    private BigDecimal igst;
    private BigDecimal grandTotal;

    // Payment
    private String paymentTxnId;
    private LocalDateTime paymentDateTime;
    private BigDecimal invoiceValue;
    private String paymentMode;
}