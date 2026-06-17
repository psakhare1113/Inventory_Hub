package com.pixelbloom.auth_server.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Service for sending welcome email + credentials to Warehouse Staff
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseStaffEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    /**
     * Send credentials email to new warehouse staff
     */
    public void sendStaffCredentials(String toEmail, String firstName, String role, String rawPassword) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Welcome to Warehouse Team - Your Login Credentials");

            String html = buildCredentialsEmailHtml(firstName, toEmail, rawPassword, role);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("Credentials email sent to warehouse staff: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send credentials email to {}: {}", toEmail, e.getMessage());
            // Staff will still be added even if email fails — credentials visible in log
        }
    }

    private String buildCredentialsEmailHtml(String firstName, String email, String password, String role) {
        String roleDisplay = formatRole(role);
        String roleColor = getRoleColor(role);

        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:20px;">
              <div style="max-width:520px; margin:auto; background:#fff; border-radius:12px; padding:36px; box-shadow:0 2px 12px rgba(0,0,0,0.10);">
                
                <!-- Header -->
                <div style="text-align:center; margin-bottom:28px;">
                  <div style="background:#1a1a2e; border-radius:10px; padding:18px;">
                    <h1 style="color:#fff; margin:0; font-size:22px;">📦 Inventory Hub</h1>
                    <p style="color:#aaa; margin:6px 0 0; font-size:13px;">Warehouse Management System</p>
                  </div>
                </div>

                <!-- Welcome -->
                <h2 style="color:#1a1a2e; margin-bottom:6px;">Welcome, %s! 👋</h2>
                <p style="color:#555; margin-bottom:20px;">
                  You have been added to the warehouse team. Below are your login credentials.
                </p>

                <!-- Role Badge -->
                <div style="text-align:center; margin-bottom:24px;">
                  <span style="background:%s; color:#fff; padding:8px 20px; border-radius:20px; font-size:14px; font-weight:bold;">
                    %s
                  </span>
                </div>

                <!-- Credentials Box -->
                <div style="background:#f8f9ff; border:2px solid #e0e4ff; border-radius:10px; padding:20px; margin-bottom:24px;">
                  <h3 style="color:#333; margin:0 0 16px; font-size:16px;">🔐 Your Login Credentials</h3>
                  
                  <div style="margin-bottom:12px;">
                    <span style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Email</span>
                    <div style="background:#fff; border:1px solid #ddd; border-radius:6px; padding:10px 14px; margin-top:4px; font-size:15px; color:#333; font-weight:500;">
                      %s
                    </div>
                  </div>
                  
                  <div>
                    <span style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Password</span>
                    <div style="background:#fff; border:1px solid #ddd; border-radius:6px; padding:10px 14px; margin-top:4px; font-size:18px; color:#4f46e5; font-weight:bold; letter-spacing:3px;">
                      %s
                    </div>
                  </div>
                </div>

                <!-- Login Button -->
                <div style="text-align:center; margin-bottom:24px;">
                  <a href="http://localhost:3000/warehouse/login" 
                     style="background:#4f46e5; color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-size:15px; font-weight:bold; display:inline-block;">
                    Login to Dashboard →
                  </a>
                </div>

                <!-- Warning -->
                <div style="background:#fff8e1; border-left:4px solid #ffc107; padding:12px 16px; border-radius:4px; margin-bottom:20px;">
                  <p style="color:#856404; margin:0; font-size:13px;">
                    ⚠️ <strong>Important:</strong> Please change your password after first login for security.
                  </p>
                </div>

                <!-- Footer -->
                <p style="color:#aaa; font-size:12px; text-align:center; margin:0;">
                  This email was sent by Inventory Hub Warehouse Management System.<br>
                  If you did not expect this email, please contact your manager.
                </p>
              </div>
            </body>
            </html>
            """.formatted(
                firstName != null ? firstName : "Team Member",
                roleColor,
                roleDisplay,
                email,
                password
        );
    }

    private String formatRole(String role) {
        return switch (role != null ? role.toUpperCase() : "") {
            case "WAREHOUSE_MANAGER" -> "🏭 Warehouse Manager";
            case "RECEIVING"         -> "📥 Receiving Staff";
            case "PICKER"            -> "🔍 Picker";
            case "PACKER"            -> "📦 Packer";
            case "SHIPPING"          -> "🚚 Shipping Staff";
            case "AUDITOR"           -> "📋 Auditor";
            case "VIEWER"            -> "👁️ Viewer";
            default                  -> role != null ? role : "Warehouse Staff";
        };
    }

    private String getRoleColor(String role) {
        return switch (role != null ? role.toUpperCase() : "") {
            case "WAREHOUSE_MANAGER" -> "#7c3aed";
            case "RECEIVING"         -> "#0891b2";
            case "PICKER"            -> "#059669";
            case "PACKER"            -> "#d97706";
            case "SHIPPING"          -> "#dc2626";
            case "AUDITOR"           -> "#4f46e5";
            default                  -> "#6b7280";
        };
    }
}
