package com.pixelbloom.orders.serviceImpl;

import com.pixelbloom.orders.event.InvoiceEvent;
import com.pixelbloom.orders.model.CustomerDetails;
import com.pixelbloom.orders.model.InvoiceItem;
import com.pixelbloom.orders.model.Order;
import com.pixelbloom.orders.model.OrderItem;
import com.pixelbloom.orders.publisher.InvoiceEventPublisher;
import com.pixelbloom.orders.service.CustomerdetailsService;
import com.pixelbloom.orders.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@Service
@Slf4j
@Transactional
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceEventPublisher invoiceEventPublisher;
    private final CustomerdetailsService customerdetailsService;

    public  InvoiceEvent publishInvoiceEvent(Order order, List<OrderItem> items) {
        // Calculate tax amounts
        BigDecimal subTotal = order.getTotalAmount();
        BigDecimal cgst = subTotal.multiply(BigDecimal.valueOf(0.02));
        BigDecimal sgst = subTotal.multiply(BigDecimal.valueOf(0.02));
        BigDecimal grandTotal = subTotal.add(cgst).add(sgst);

        // Fetch customer details for invoice
        CustomerDetails customer = customerdetailsService.CustomerDetailsById(order.getCustomerId());
        if (customer == null) {
            log.warn("Customer details not found for customerId: {}, using default values", order.getCustomerId());
            // Create invoice with minimal customer info instead of skipping
            customer = createDefaultCustomerDetails(order.getCustomerId());
        }

        String customerName = customer.getFirstName() + " " + customer.getLastName();
        String customerAddress = customer.getAddressLine1() + ", " + customer.getCity() +
                ", " + customer.getState() + " - " + customer.getPincode();

        InvoiceEvent invoiceEvent = InvoiceEvent.builder()
                .orderNumber(order.getOrderNumber())
                .customerId(customer.getCustomerId())
                .email(customer.getEmail())
                .billingName(customerName)
                .billingAddress(customerAddress)
                .shippingName(customerName)
                .shippingAddress(customerAddress)
                .invoiceNumber("INV-" + order.getOrderNumber().substring(0, 8))
                .orderDate(order.getCreatedAt())
                .invoiceDate(LocalDateTime.now())
                .sellerName("PixelBloom Pvt Ltd")
                .sellerAddress("123 Business Park, Mumbai, Maharashtra - 400001")
                .sellerGstin("27AABCP1234F1Z5")
                .sellerPan("AABCP1234F")
                .billingStateCode("27")
                .shippingStateCode("27")
                .shippingBarcode(order.getOrderNumber())
                .invoiceDetails("Tax Invoice")
                .placeOfSupply("Maharashtra")
                .placeOfDelivery("Maharashtra")
                .items(items.stream()
                        .map(item -> InvoiceItem.builder()
                                .description("Product " + item.getProductId())
                                .quantity(item.getQuantity())
                                .unitPrice(item.getUnitPrice())
                                .taxAmount(item.getUnitPrice().multiply(BigDecimal.valueOf(0.18)))
                                .lineTotal(item.getTotalPrice())
                                .build())
                        .toList())
                .subTotal(subTotal)
                .cgst(cgst)
                .sgst(sgst)
                .igst(BigDecimal.ZERO)
                .grandTotal(grandTotal)
                .paymentTxnId("TXN-" + UUID.randomUUID().toString().substring(0, 8))
                .paymentDateTime(LocalDateTime.now())
                .invoiceValue(grandTotal)
                .paymentMode(order.getPaymentMode())
                .build();

        invoiceEventPublisher.publishInvoiceEvent(invoiceEvent);
        return invoiceEvent;
    }

    private CustomerDetails createDefaultCustomerDetails(Long customerId) {
        CustomerDetails defaultCustomer = new CustomerDetails();
        defaultCustomer.setCustomerId(customerId);
        defaultCustomer.setFirstName("Customer");
        defaultCustomer.setLastName(String.valueOf(customerId));
        defaultCustomer.setEmail("customer" + customerId + "@example.com");
        defaultCustomer.setAddressLine1("Address not available");
        defaultCustomer.setCity("Unknown");
        defaultCustomer.setState("Unknown");
        defaultCustomer.setPincode("000000");
        return defaultCustomer;
    }
}
