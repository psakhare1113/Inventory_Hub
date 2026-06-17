package com.pixelbloom.products.controller;

import com.pixelbloom.products.response.UserAnalyticsResponse;
import com.pixelbloom.products.service.UserAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final UserAnalyticsService userAnalyticsService;

    @GetMapping("/users")
    public ResponseEntity<UserAnalyticsResponse> getUserAnalytics(
            @RequestParam(defaultValue = "30") int days) {
        
        UserAnalyticsResponse analytics = userAnalyticsService.getAnalytics(days);
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/users/{userId}/activity")
    public ResponseEntity<UserAnalyticsResponse.OnlineUserInfo> getUserActivity(
            @PathVariable Long userId) {
        
        UserAnalyticsResponse.OnlineUserInfo activity = userAnalyticsService.getUserActivity(userId);
        if (activity != null) {
            return ResponseEntity.ok(activity);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/users/{userId}/track-login")
    public ResponseEntity<Void> trackLogin(
            @PathVariable Long userId,
            @RequestParam String sessionToken,
            jakarta.servlet.http.HttpServletRequest request) {
        
        userAnalyticsService.trackLogin(userId, sessionToken, request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{userId}/track-logout")
    public ResponseEntity<Void> trackLogout(@PathVariable Long userId) {
        userAnalyticsService.trackLogout(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{userId}/update-activity")
    public ResponseEntity<Void> updateActivity(@PathVariable Long userId) {
        userAnalyticsService.updateLastActivity(userId);
        return ResponseEntity.ok().build();
    }
}