package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.model.UserSession;
import com.pixelbloom.products.repository.UserSessionRepository;
import com.pixelbloom.products.response.UserAnalyticsResponse;
import com.pixelbloom.products.service.UserAnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAnalyticsServiceImpl implements UserAnalyticsService {

    private final UserSessionRepository userSessionRepository;

    @Override
    @Transactional
    public void trackLogin(Long userId, String sessionToken, HttpServletRequest request) {
        // End any existing active session
        Optional<UserSession> existingSession = userSessionRepository.findByUserIdAndIsActiveTrue(userId);
        if (existingSession.isPresent()) {
            UserSession session = existingSession.get();
            session.setLogoutTime(LocalDateTime.now());
            session.setIsActive(false);
            userSessionRepository.save(session);
        }

        // Create new session
        UserSession newSession = new UserSession();
        newSession.setUserId(userId);
        newSession.setSessionToken(sessionToken);
        newSession.setIpAddress(getClientIpAddress(request));
        newSession.setUserAgent(request.getHeader("User-Agent"));
        newSession.setIsActive(true);
        
        userSessionRepository.save(newSession);
    }

    @Override
    @Transactional
    public void trackLogout(Long userId) {
        Optional<UserSession> activeSession = userSessionRepository.findByUserIdAndIsActiveTrue(userId);
        if (activeSession.isPresent()) {
            UserSession session = activeSession.get();
            session.setLogoutTime(LocalDateTime.now());
            session.setIsActive(false);
            userSessionRepository.save(session);
        }
    }

    @Override
    @Transactional
    public void updateLastActivity(Long userId) {
        Optional<UserSession> activeSession = userSessionRepository.findByUserIdAndIsActiveTrue(userId);
        if (activeSession.isPresent()) {
            UserSession session = activeSession.get();
            session.setLastActivity(LocalDateTime.now());
            userSessionRepository.save(session);
        }
    }

    @Override
    public UserAnalyticsResponse getAnalytics(int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        LocalDateTime today = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime thisWeek = LocalDateTime.now().minusDays(7);

        UserAnalyticsResponse response = new UserAnalyticsResponse();

        // Overall stats
        response.setTotalActiveUsers(userSessionRepository.countActiveUsersInPeriod(since));
        response.setTotalSessionsToday(userSessionRepository.countSessionsInPeriod(today));
        response.setTotalSessionsThisWeek(userSessionRepository.countSessionsInPeriod(thisWeek));
        response.setAverageSessionDuration(userSessionRepository.getAverageSessionDuration(since));

        // Currently online users (active in last 30 minutes)
        LocalDateTime thirtyMinutesAgo = LocalDateTime.now().minusMinutes(30);
        List<UserSession> activeSessions = userSessionRepository.findActiveSessionsOrderByActivity();
        List<UserAnalyticsResponse.OnlineUserInfo> onlineUsers = activeSessions.stream()
                .filter(session -> session.getLastActivity().isAfter(thirtyMinutesAgo))
                .map(session -> {
                    UserAnalyticsResponse.OnlineUserInfo info = new UserAnalyticsResponse.OnlineUserInfo();
                    info.setUserId(session.getUserId());
                    info.setUserName("User " + session.getUserId()); // You can fetch actual username from user service
                    info.setLoginTime(session.getLoginTime());
                    info.setLastActivity(session.getLastActivity());
                    info.setIpAddress(session.getIpAddress());
                    info.setMinutesOnline(Duration.between(session.getLoginTime(), LocalDateTime.now()).toMinutes());
                    return info;
                })
                .collect(Collectors.toList());

        response.setCurrentlyOnline(onlineUsers);
        response.setCurrentlyOnlineUsers((long) onlineUsers.size());

        // Daily stats
        List<Object[]> dailyStatsRaw = userSessionRepository.getDailyUserStats(since);
        List<UserAnalyticsResponse.DailyUserStat> dailyStats = dailyStatsRaw.stream()
                .map(row -> new UserAnalyticsResponse.DailyUserStat(
                        row[0].toString(),
                        ((Number) row[1]).longValue(),
                        ((Number) row[2]).longValue()
                ))
                .collect(Collectors.toList());
        response.setDailyStats(dailyStats);

        // Most active users
        List<Object[]> activeUsersRaw = userSessionRepository.getMostActiveUsers(since);
        List<UserAnalyticsResponse.ActiveUserStat> activeUsers = activeUsersRaw.stream()
                .limit(10)
                .map(row -> {
                    Long userId = ((Number) row[0]).longValue();
                    Long sessionCount = ((Number) row[1]).longValue();
                    
                    // Get last login time
                    List<UserSession> userSessions = userSessionRepository.findByUserIdOrderByLoginTimeDesc(userId);
                    LocalDateTime lastLogin = userSessions.isEmpty() ? null : userSessions.get(0).getLoginTime();
                    
                    return new UserAnalyticsResponse.ActiveUserStat(
                            userId,
                            "User " + userId, // You can fetch actual username
                            sessionCount,
                            lastLogin
                    );
                })
                .collect(Collectors.toList());
        response.setMostActiveUsers(activeUsers);

        return response;
    }

    @Override
    public UserAnalyticsResponse.OnlineUserInfo getUserActivity(Long userId) {
        Optional<UserSession> activeSession = userSessionRepository.findByUserIdAndIsActiveTrue(userId);
        if (activeSession.isPresent()) {
            UserSession session = activeSession.get();
            UserAnalyticsResponse.OnlineUserInfo info = new UserAnalyticsResponse.OnlineUserInfo();
            info.setUserId(session.getUserId());
            info.setUserName("User " + session.getUserId());
            info.setLoginTime(session.getLoginTime());
            info.setLastActivity(session.getLastActivity());
            info.setIpAddress(session.getIpAddress());
            info.setMinutesOnline(Duration.between(session.getLoginTime(), LocalDateTime.now()).toMinutes());
            return info;
        }
        return null;
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader == null) {
            return request.getRemoteAddr();
        } else {
            return xForwardedForHeader.split(",")[0];
        }
    }
}