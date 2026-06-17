package com.pixelbloom.auth_server.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otp, String firstName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Verify Your Email - OTP Code");

            String html = buildOtpEmailHtml(firstName, otp);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("OTP email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send verification email. Please try again.");
        }
    }

    private String buildOtpEmailHtml(String firstName, String otp) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:20px;">
              <div style="max-width:480px; margin:auto; background:#fff; border-radius:10px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <h2 style="color:#333; margin-bottom:8px;">Email Verification</h2>
                <p style="color:#555;">Hi %s,</p>
                <p style="color:#555;">Use the OTP below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
                <div style="text-align:center; margin:28px 0;">
                  <span style="font-size:36px; font-weight:bold; letter-spacing:10px; color:#4f46e5; background:#f0f0ff; padding:14px 28px; border-radius:8px;">%s</span>
                </div>
                <p style="color:#888; font-size:13px;">If you did not request this, please ignore this email.</p>
              </div>
            </body>
            </html>
            """.formatted(firstName != null ? firstName : "User", otp);
    }
}
