package com.pixelbloom.email_service.serviceImpls;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.pixelbloom.email_service.model.InvoiceEvent;
import com.pixelbloom.email_service.model.InvoiceItem;
import com.pixelbloom.email_service.service.InvoiceService;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
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
            // Determine barcode value: prefer shippingBarcode, fallback to orderNumber
            String barcodeText = (event.getShippingBarcode() != null && !event.getShippingBarcode().isBlank())
                    ? event.getShippingBarcode()
                    : event.getOrderNumber();

            byte[] barcodeBytes = generateBarcodeBytes(barcodeText);
            String invoiceHtml = loadAndPopulateTemplate(event, barcodeText);
            sendInvoiceEmail(event.getOrderNumber(), invoiceHtml, event.getEmail(), barcodeBytes);
            log.info("Invoice sent successfully for order: {}", event.getOrderNumber());
        } catch (Exception e) {
            log.error("Failed to send invoice for order: {}", event.getOrderNumber(), e);
        }
    }

    private void sendInvoiceEmail(String orderNumber, String htmlContent, String customerEmail,
                                  byte[] barcodeBytes) throws Exception {
        MimeMessage message = javaMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        String recipient = (customerEmail != null && !customerEmail.isBlank()
                && !customerEmail.endsWith("@example.com")) ? customerEmail : toEmail;

        helper.setFrom(fromEmail);
        helper.setTo(recipient);
        helper.setSubject("Invoice for Order: " + orderNumber);
        helper.setText(htmlContent, true);

        // Add inline logo
        ClassPathResource logo = new ClassPathResource("static/images/logo.png");
        helper.addInline("logo", logo);

        // Add barcode as CID inline attachment — email clients block data: URIs but allow cid:
        if (barcodeBytes != null && barcodeBytes.length > 0) {
            helper.addInline("shippingBarcode",
                    new ByteArrayDataSource(barcodeBytes, "image/png"));
        }

        javaMailSender.send(message);
        log.info("Invoice email sent to: {}", recipient);
    }

    /**
     * Generates a CODE_128 barcode as a PNG byte array.
     * Returns null if generation fails.
     */
    private byte[] generateBarcodeBytes(String barcodeText) {
        if (barcodeText == null || barcodeText.isBlank()) return null;
        try {
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.MARGIN, 2);

            BitMatrix bitMatrix = new MultiFormatWriter().encode(
                    barcodeText,
                    BarcodeFormat.CODE_128,
                    350, 80,
                    hints
            );

            BufferedImage barcodeImage = MatrixToImageWriter.toBufferedImage(bitMatrix);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(barcodeImage, "PNG", baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.warn("Failed to generate barcode for value '{}': {}", barcodeText, e.getMessage());
            return null;
        }
    }

    private String loadAndPopulateTemplate(InvoiceEvent event, String barcodeText) throws Exception {
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

            // ${shippingBarcode} → cid:shippingBarcode (inline attachment, works in all email clients)
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
                    .replace("${shippingBarcode}", "cid:shippingBarcode")
                    .replace("${shippingBarcodeText}", barcodeText)
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
