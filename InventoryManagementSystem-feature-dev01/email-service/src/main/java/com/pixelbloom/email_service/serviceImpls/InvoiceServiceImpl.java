package com.pixelbloom.email_service.serviceImpls;
import com.pixelbloom.email_service.model.InvoiceEvent;
import com.pixelbloom.email_service.model.InvoiceItem;
import com.pixelbloom.email_service.service.InvoiceService;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private final JavaMailSender javaMailSender;

    @Value("${invoice.email.from:pixelbloomdigital02@gmail.com}")
    private String fromEmail;

    @Value("${invoice.email.to:pixelbloomdigital02@gmail.com}")
    private String toEmail;

    @Override
    public void generateAndSendInvoice(InvoiceEvent event) {
        log.info("Generating invoice for order: {}", event.getOrderNumber());

        try {
            String invoiceHtml = loadAndPopulateTemplate(event);
            sendInvoiceEmail(event.getOrderNumber(), invoiceHtml);
            log.info("Invoice sent successfully for order: {}", event.getOrderNumber());
        } catch (Exception e) {
            log.error("Failed to send invoice for order: {}", event.getOrderNumber(), e);
        }
    }

    private void sendInvoiceEmail(String orderNumber, String htmlContent) throws Exception {
        MimeMessage message = javaMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject("Invoice for Order: " + orderNumber);
        helper.setText(htmlContent, true);

        // Add inline logo
        ClassPathResource logo = new ClassPathResource("static/images/logo.png");
        helper.addInline("logo", logo);

        javaMailSender.send(message);
        log.info("Email sent to: {}", toEmail);
    }

    private String loadAndPopulateTemplate(InvoiceEvent event) throws Exception {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm");

        try (InputStream inputStream = Objects.requireNonNull(
                getClass().getResourceAsStream("/templates/InvoiceTemplate.html"))) {

            String template = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);

            // Build items table rows
            StringBuilder itemsHtml = new StringBuilder();
            int index = 1;
            for (InvoiceItem item : event.getItems()) {
                itemsHtml.append(String.format(
                        "<tr><td>%d</td><td>%s</td><td>%d</td><td>₹%s</td><td>₹%s</td><td>₹%s</td></tr>",
                        index++, item.getDescription(), item.getQuantity(),
                        item.getUnitPrice(), item.getTaxAmount(), item.getLineTotal()
                ));
            }

            // Replace placeholders
            return template
                    .replace("${sellerName}", event.getSellerName())
                    .replace("${sellerAddress}", event.getSellerAddress())
                    .replace("${sellerGstin}", event.getSellerGstin())
                    .replace("${sellerPan}", event.getSellerPan())
                    .replace("${billingName}", event.getBillingName())
                    .replace("${billingAddress}", event.getBillingAddress())
                    .replace("${billingStateCode}", event.getBillingStateCode())
                    .replace("${shippingName}", event.getShippingName())
                    .replace("${shippingAddress}", event.getShippingAddress())
                    .replace("${shippingStateCode}", event.getShippingStateCode())
                    .replace("${orderNumber}", event.getOrderNumber())
                    .replace("${invoiceNumber}", event.getInvoiceNumber())
                    .replace("${orderDate}", event.getOrderDate().format(formatter))
                    .replace("${invoiceDate}", event.getInvoiceDate().format(formatter))
                    .replace("${invoiceDetails}", event.getInvoiceDetails())
                    .replace("${placeOfSupply}", event.getPlaceOfSupply())
                    .replace("${placeOfDelivery}", event.getPlaceOfDelivery())
                    .replace("${itemRows}", itemsHtml.toString())
                    .replace("${subTotal}", event.getSubTotal().toString())
                    .replace("${cgst}", event.getCgst().toString())
                    .replace("${sgst}", event.getSgst().toString())
                    .replace("${igst}", event.getIgst().toString())
                    .replace("${grandTotal}", event.getGrandTotal().toString())
                    .replace("${paymentTxnId1}", event.getPaymentTxnId())
                    .replace("${paymentDateTime1}", event.getPaymentDateTime().format(formatter))
                    .replace("${invoiceValue}", event.getInvoiceValue().toString())
                    .replace("${paymentMode1}", event.getPaymentMode());
        }
    }
}
