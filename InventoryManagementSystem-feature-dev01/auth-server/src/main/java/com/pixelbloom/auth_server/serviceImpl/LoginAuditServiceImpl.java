package com.pixelbloom.auth_server.serviceImpl;

import com.pixelbloom.auth_server.model.LoginAudit;
import com.pixelbloom.auth_server.repository.LoginAuditRepository;
import com.pixelbloom.auth_server.service.LoginAuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LoginAuditServiceImpl implements LoginAuditService {
    
    private final LoginAuditRepository loginAuditRepository;
    
    // Lock account after 5 failed attempts within 15 minutes
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_DURATION_MINUTES = 15;
    
    @Override
    @Transactional
    public void logLoginAttempt(Long customerId, String email, String status, String failureReason,
                               String loginMethod, HttpServletRequest request) {
        LoginAudit audit = LoginAudit.builder()
                .customerId(customerId)
                .email(email)
                .status(status)
                .loginTime(LocalDateTime.now())
                .ipAddress(getClientIpAddress(request))
                .userAgent(request.getHeader("User-Agent"))
                .deviceInfo(extractDeviceInfo(request))
                .browserInfo(extractBrowserInfo(request))
                .failureReason(failureReason)
                .loginMethod(loginMethod)
                .sessionId(UUID.randomUUID().toString())
                .build();
        
        loginAuditRepository.save(audit);
    }
    
    @Override
    public List<LoginAudit> getLoginHistory(Long customerId) {
        return loginAuditRepository.findByCustomerId(customerId);
    }
    
    @Override
    public List<LoginAudit> getLoginHistoryByEmail(String email) {
        return loginAuditRepository.findByEmail(email);
    }
    
    @Override
    public List<LoginAudit> getRecentFailedAttempts(String email, int minutes) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(minutes);
        return loginAuditRepository.findRecentFailedAttempts(email, since);
    }
    
    @Override
    public long countFailedAttemptsSince(String email, LocalDateTime since) {
        return loginAuditRepository.countFailedAttemptsSince(email, since);
    }
    
    @Override
    public Map<String, Long> getLoginStats(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<Object[]> stats = loginAuditRepository.getLoginStatsSince(since);
        
        Map<String, Long> result = new HashMap<>();
        for (Object[] stat : stats) {
            result.put((String) stat[0], (Long) stat[1]);
        }
        return result;
    }
    
    @Override
    public boolean shouldLockAccount(String email) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(LOCKOUT_DURATION_MINUTES);
        long failedAttempts = countFailedAttemptsSince(email, since);
        return failedAttempts >= MAX_FAILED_ATTEMPTS;
    }
    
    /**
     * Extract client IP address from request
     */
    public String getClientIpAddress(HttpServletRequest request) {
        String[] headers = {
            "X-Forwarded-For",
            "Proxy-Client-IP",
            "WL-Proxy-Client-IP",
            "HTTP_X_FORWARDED_FOR",
            "HTTP_X_FORWARDED",
            "HTTP_X_CLUSTER_CLIENT_IP",
            "HTTP_CLIENT_IP",
            "HTTP_FORWARDED_FOR",
            "HTTP_FORWARDED",
            "HTTP_VIA",
            "REMOTE_ADDR"
        };
        
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }
        
        return request.getRemoteAddr();
    }
    
    /**
     * Extract device information from User-Agent
     */
    public String extractDeviceInfo(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) return "Unknown";
        
        if (userAgent.contains("Mobile")) return "Mobile";
        if (userAgent.contains("Tablet")) return "Tablet";
        if (userAgent.contains("Windows")) return "Windows PC";
        if (userAgent.contains("Mac")) return "Mac";
        if (userAgent.contains("Linux")) return "Linux";
        
        return "Unknown";
    }
    
    /**
     * Extract browser information from User-Agent
     */
    private String extractBrowserInfo(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) return "Unknown";
        
        if (userAgent.contains("Edg")) return "Edge";
        if (userAgent.contains("Chrome")) return "Chrome";
        if (userAgent.contains("Firefox")) return "Firefox";
        if (userAgent.contains("Safari") && !userAgent.contains("Chrome")) return "Safari";
        if (userAgent.contains("Opera") || userAgent.contains("OPR")) return "Opera";
        
        return "Unknown";
    }
}
