package com.pixelbloom.products.service;

import com.pixelbloom.products.response.UserAnalyticsResponse;
import jakarta.servlet.http.HttpServletRequest;

public interface UserAnalyticsService {
    
    void trackLogin(Long userId, String sessionToken, HttpServletRequest request);
    
    void trackLogout(Long userId);
    
    void updateLastActivity(Long userId);
    
    UserAnalyticsResponse getAnalytics(int days);
    
    UserAnalyticsResponse.OnlineUserInfo getUserActivity(Long userId);
}