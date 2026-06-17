package com.pixelbloom.email_service.controller;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    @Value("${invoice.email.from:psakhare3592@gmail.com}")
    private String fromEmail;

    //created an 2-step auth in gmail-sec
    //manage ur gmail account -> get app password for demo app & use it in application prop without spaces
    //with below basic controller method we can send email
    private final JavaMailSender javaMailSender;

    public EmailController(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    /**
     * PO Approved Notification — called by warehouse-service when Admin approves a PO.
     * Sends a professional HTML email to the Warehouse Manager.
     */
    @PostMapping("/po-approved")
    public ResponseEntity<String> sendPoApprovedEmail(@RequestBody Map<String, Object> payload) {
        try {
            String to          = (String) payload.getOrDefault("to", "psakhare1113@gmail.com");
            String poNumber    = (String) payload.getOrDefault("poNumber", "N/A");
            String supplierName = (String) payload.getOrDefault("supplierName", "N/A");
            String expectedDate = (String) payload.getOrDefault("expectedDate", "N/A");
            String totalAmount  = (String) payload.getOrDefault("totalAmount", "N/A");
            Object totalItemsObj = payload.getOrDefault("totalItems", 0);
            String totalItems   = totalItemsObj.toString();

            // Load HTML template
            try (InputStream is = Objects.requireNonNull(
                    getClass().getResourceAsStream("/templates/POApproved.html"))) {

                String html = new String(is.readAllBytes(), StandardCharsets.UTF_8)
                        .replace("${poNumber}",    poNumber)
                        .replace("${supplierName}", supplierName)
                        .replace("${expectedDate}", expectedDate)
                        .replace("${totalAmount}",  totalAmount)
                        .replace("${totalItems}",   totalItems);

                MimeMessage message = javaMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(fromEmail);
                helper.setTo(to);
                helper.setSubject("📦 PO Approved: " + poNumber + " — Action Required");
                helper.setText(html, true);

                // Add inline logo
                ClassPathResource logo = new ClassPathResource("static/images/logo.png");
                if (logo.exists()) {
                    helper.addInline("logo", logo);
                }

                javaMailSender.send(message);
                return ResponseEntity.ok("PO Approved email sent to " + to);
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Failed to send email: " + e.getMessage());
        }
    }

    /**
     * Inventory Updated — notifies Admin when inventory is added after receiving.
     * Called by warehouse-service after completePutaway().
     */
    @PostMapping("/inventory-updated")
    public ResponseEntity<String> sendInventoryUpdatedEmail(@RequestBody Map<String, Object> payload) {
        try {
            String to          = (String) payload.getOrDefault("to", "admin@warehouse.com");
            String productName = (String) payload.getOrDefault("productName", "N/A");
            String productId   = String.valueOf(payload.getOrDefault("productId", "N/A"));
            String qtyAdded    = String.valueOf(payload.getOrDefault("qtyAdded", "0"));
            String grnNumber   = (String) payload.getOrDefault("grnNumber", "N/A");
            String warehouseId = String.valueOf(payload.getOrDefault("warehouseId", "N/A"));
            String condition   = (String) payload.getOrDefault("condition", "GOOD");
            String updatedAt   = (String) payload.getOrDefault("updatedAt",
                    java.time.LocalDateTime.now().toString().replace("T", " ").substring(0, 19));

            try (InputStream is = Objects.requireNonNull(
                    getClass().getResourceAsStream("/templates/InventoryUpdated.html"))) {

                String html = new String(is.readAllBytes(), StandardCharsets.UTF_8)
                        .replace("${productName}", productName)
                        .replace("${productId}",   productId)
                        .replace("${qtyAdded}",    qtyAdded)
                        .replace("${grnNumber}",   grnNumber)
                        .replace("${warehouseId}", warehouseId)
                        .replace("${condition}",   condition)
                        .replace("${updatedAt}",   updatedAt);

                MimeMessage message = javaMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(fromEmail);
                helper.setTo(to);
                helper.setSubject("📦 Inventory Updated: " + productName + " +" + qtyAdded + " units");
                helper.setText(html, true);

                ClassPathResource logo = new ClassPathResource("static/images/logo.png");
                if (logo.exists()) helper.addInline("logo", logo);

                javaMailSender.send(message);
                return ResponseEntity.ok("Inventory updated email sent to " + to);
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Failed to send inventory updated email: " + e.getMessage());
        }
    }

    /**
     * Receiving Alert — called by warehouse-service when Warehouse Manager clicks "Notify Team".
     * Sends email ONLY to the Receiving Clerk (not all warehouse staff).
     *
     * Payload fields:
     *   to           — receiving clerk email
     *   poNumber     — PO number
     *   supplierName — supplier name
     *   expectedDate — expected delivery date
     *   itemsList    — comma-separated list of items e.g. "T-Shirt: 500 units, Jeans: 200 units"
     *   totalAmount  — total PO amount
     *   managerNote  — optional note from warehouse manager
     */
    @PostMapping("/receiving-alert")
    public ResponseEntity<String> sendReceivingAlertEmail(@RequestBody Map<String, Object> payload) {
        try {
            String to           = (String) payload.getOrDefault("to", "receiving@warehouse.com");
            String poNumber     = (String) payload.getOrDefault("poNumber", "N/A");
            String supplierName = (String) payload.getOrDefault("supplierName", "N/A");
            String expectedDate = (String) payload.getOrDefault("expectedDate", "N/A");
            String itemsList    = (String) payload.getOrDefault("itemsList", "N/A");
            String totalAmount  = (String) payload.getOrDefault("totalAmount", "N/A");
            String managerNote  = (String) payload.getOrDefault("managerNote",
                    "Please allocate space and prepare for receiving.");

            try (InputStream is = Objects.requireNonNull(
                    getClass().getResourceAsStream("/templates/ReceivingAlert.html"))) {

                String html = new String(is.readAllBytes(), StandardCharsets.UTF_8)
                        .replace("${poNumber}",     poNumber)
                        .replace("${supplierName}", supplierName)
                        .replace("${expectedDate}", expectedDate)
                        .replace("${itemsList}",    itemsList)
                        .replace("${totalAmount}",  totalAmount)
                        .replace("${managerNote}",  managerNote);

                MimeMessage message = javaMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(fromEmail);
                helper.setTo(to);
                helper.setSubject("📦 Incoming Stock Alert: " + poNumber + " — Please Prepare for Receiving");
                helper.setText(html, true);

                ClassPathResource logo = new ClassPathResource("static/images/logo.png");
                if (logo.exists()) {
                    helper.addInline("logo", logo);
                }

                javaMailSender.send(message);
                return ResponseEntity.ok("Receiving alert email sent to " + to);
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body("Failed to send receiving alert email: " + e.getMessage());
        }
    }

    @RequestMapping("/send-email")
    public String sendEmail() {
        try {
            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setFrom("pixelbloomdigital02@gmail.com");
            mailMessage.setSubject("mail from teju");
            mailMessage.setText("This is sample email body from demo");
            mailMessage.setTo("pixelbloomdigital02@gmail.com");
            javaMailSender.send(mailMessage);
            return "mail sent success";
        } catch (Exception e) {
            return e.getMessage();
        }
    }


    @RequestMapping("/send-email-withAttachment")
    public String sendEmailwithAttachment() {
        try {
            MimeMessage mailMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mailMessage, true);
            helper.setFrom("pixelbloomdigital02@gmail.com");
            helper.setSubject("mail sent with attachment");
            helper.setText("This is sample email body from demo with attachment");
            helper.setTo("pixelbloomdigital02@gmail.com");
            helper.addAttachment("coverLetter.pdf", new File("D:\\Teju-AppData\\CV-Versions\\pdf-Versions\\coverLetter.pdf"));
            javaMailSender.send(mailMessage);
            return "mail sent success";
        } catch (Exception e) {
            return e.getMessage();
        }
    }



    @RequestMapping("/send-email-withTemplate")
    public String sendEmailwithAttachmentTemplate() {
        try {
            MimeMessage mailMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mailMessage, true);
            helper.setFrom("pixelbloomdigital02@gmail.com");
            helper.setSubject("mail sent with attachment");
            helper.setTo("pixelbloomdigital02@gmail.com");
            try (var inputStream = Objects.requireNonNull(EmailController.class.getResourceAsStream("/templates/email-content.html"))) {
                helper.setText(
                        new String(inputStream.readAllBytes(), StandardCharsets.UTF_8),
                        true
                );
          }
            helper.addInline("logo.jpg", new File("D:\\Teju-AppData\\logo.jpg"));

            javaMailSender.send(mailMessage);
            return "mail sent success";
        } catch (Exception e) {
            return e.getMessage();
        }
    }
}
