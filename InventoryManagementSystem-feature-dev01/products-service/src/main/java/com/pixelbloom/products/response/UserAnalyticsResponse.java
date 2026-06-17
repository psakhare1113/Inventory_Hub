package com.pixelbloom.products.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAnalyticsResponse {
    
    // Overall Stats
    private Long totalActiveUsers;
    private Long totalSessionsToday;
    private Long totalSessionsThisWeek;
    private Double averageSessionDuration;
    private Long currentlyOnlineUsers;
    
    // Daily Stats
    private List<DailyUserStat> dailyStats;
    
    // Most Active Users
    private List<ActiveUserStat> mostActiveUsers;
    
    // Currently Online Users
    private List<OnlineUserInfo> currentlyOnline;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyUserStat {
        private String date;
        private Long uniqueUsers;
        private Long totalSessions;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActiveUserStat {
        private Long userId;
        private String userName;
        private Long sessionCount;
        private LocalDateTime lastLogin;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OnlineUserInfo {
        private Long userId;
        private String userName;
        private LocalDateTime loginTime;
        private LocalDateTime lastActivity;
        private String ipAddress;
        private Long minutesOnline;
    }
}