package com.pixelbloom.auth_server.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Email service for Delivery Boy Application lifecycle emails.
 * - Application received confirmation
 * - Approved email (with login link)
 * - Rejected email (with reason)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryBoyApplicationEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    // ── Application Received ──────────────────────────────────────────────────
    public void sendApplicationReceivedEmail(String toEmail, String firstName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Application Received - Delivery Partner Registration");
            helper.setText(buildReceivedHtml(firstName), true);
            mailSender.send(message);
            log.info("Application received email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send application received email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ── Approved Email ────────────────────────────────────────────────────────
    public void sendApprovedEmail(String toEmail, String firstName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("🎉 Congratulations! You're Approved as Delivery Partner");
            helper.setText(buildApprovedHtml(firstName), true);
            mailSender.send(message);
            log.info("Approval email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send approval email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ── Rejected Email ────────────────────────────────────────────────────────
    public void sendRejectedEmail(String toEmail, String firstName, String reason) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Update on Your Delivery Partner Application");
            helper.setText(buildRejectedHtml(firstName, reason), true);
            mailSender.send(message);
            log.info("Rejection email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send rejection email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ── HTML Templates ────────────────────────────────────────────────────────

    private String buildReceivedHtml(String firstName) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
              <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:36px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                <div style="text-align:center;margin-bottom:24px;">
                  <div style="width:64px;height:64px;background:linear-gradient(135deg,#D4A017,#F5C842);border-radius:50%%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">🚚</div>
                </div>
                <h2 style="color:#1A1A2E;text-align:center;margin:0 0 8px;">Application Received!</h2>
                <p style="color:#555;text-align:center;margin:0 0 24px;">Hi <strong>%s</strong>, we've received your delivery partner application.</p>
                <div style="background:#FDF6E3;border:1px solid #E8C84A;border-radius:10px;padding:18px;margin-bottom:20px;">
                  <p style="margin:0;color:#7A5C00;font-size:14px;line-height:1.6;">
                    ✅ Your application is under review.<br>
                    ⏳ Our team will verify your documents within <strong>24-48 hours</strong>.<br>
                    📧 You'll receive an email once a decision is made.
                  </p>
                </div>
                <p style="color:#888;font-size:12px;text-align:center;">If you have questions, contact our support team.</p>
              </div>
            </body>
            </html>
            """.formatted(firstName != null ? firstName : "Applicant");
    }

    private String buildApprovedHtml(String firstName) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
              <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:36px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                <div style="text-align:center;margin-bottom:24px;">
                  <div style="width:72px;height:72px;background:linear-gradient(135deg,#16a34a,#22c55e);border-radius:50%%;display:inline-flex;align-items:center;justify-content:center;font-size:32px;">🎉</div>
                </div>
                <h2 style="color:#166534;text-align:center;margin:0 0 8px;">You're Approved!</h2>
                <p style="color:#555;text-align:center;margin:0 0 24px;">Congratulations <strong>%s</strong>! Your delivery partner application has been approved.</p>
                <div style="background:#dcfce7;border:1px solid #86efac;border-radius:10px;padding:18px;margin-bottom:24px;">
                  <p style="margin:0 0 12px;color:#166534;font-weight:700;font-size:15px;">🚀 You can now start delivering!</p>
                  <p style="margin:0;color:#166534;font-size:14px;line-height:1.7;">
                    1. Go to the Delivery Portal<br>
                    2. Login with your registered email & password<br>
                    3. Start accepting delivery orders!
                  </p>
                </div>
                <div style="text-align:center;margin-bottom:20px;">
                  <a href="http://localhost:3000/delivery/login"
                     style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#D4A017,#F5C842);color:#1A1A2E;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(212,160,23,0.4);">
                    🚚 Go to Delivery Portal
                  </a>
                </div>
                <p style="color:#888;font-size:12px;text-align:center;">Welcome to the team! Happy delivering 🎊</p>
              </div>
            </body>
            </html>
            """.formatted(firstName != null ? firstName : "Partner");
    }

    private String buildRejectedHtml(String firstName, String reason) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
              <div style="max-width:520px;margin:auto;background:#fff;border-radius:12px;padding:36px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                <div style="text-align:center;margin-bottom:24px;">
                  <div style="width:64px;height:64px;background:linear-gradient(135deg,#dc2626,#ef4444);border-radius:50%%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;">📋</div>
                </div>
                <h2 style="color:#991b1b;text-align:center;margin:0 0 8px;">Application Update</h2>
                <p style="color:#555;text-align:center;margin:0 0 24px;">Hi <strong>%s</strong>, we've reviewed your delivery partner application.</p>
                <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:10px;padding:18px;margin-bottom:20px;">
                  <p style="margin:0 0 8px;color:#991b1b;font-weight:700;">Unfortunately, we cannot approve your application at this time.</p>
                  <p style="margin:0;color:#7f1d1d;font-size:14px;"><strong>Reason:</strong> %s</p>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px;">
                  <p style="margin:0;color:#374151;font-size:13px;line-height:1.6;">
                    You may re-apply after correcting the issues mentioned above.<br>
                    If you believe this is an error, please contact our support team.
                  </p>
                </div>
                <p style="color:#888;font-size:12px;text-align:center;">Thank you for your interest in joining our delivery team.</p>
              </div>
            </body>
            </html>
            """.formatted(
                firstName != null ? firstName : "Applicant",
                reason != null && !reason.isBlank() ? reason : "Documents could not be verified. Please resubmit with clear, valid documents."
            );
    }
}
