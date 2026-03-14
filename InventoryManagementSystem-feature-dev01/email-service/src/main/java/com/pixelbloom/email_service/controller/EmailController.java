package com.pixelbloom.email_service.controller;

import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMailMessage;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    //created an 2-step auth in gmail-sec
    //manage ur gmail account -> get app password for demo app & use it in application prop without spaces
    //with below basic controller method we can send email
    private final JavaMailSender javaMailSender;

    public EmailController(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;

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
