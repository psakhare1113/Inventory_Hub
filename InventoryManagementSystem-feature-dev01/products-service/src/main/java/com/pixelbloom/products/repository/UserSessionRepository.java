package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    Optional<UserSession> findByUserIdAndIsActiveTrue(Long userId);

    @Query("SELECT COUNT(DISTINCT us.userId) FROM UserSession us WHERE us.loginTime >= :since")
    Long countActiveUsersInPeriod(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(us) FROM UserSession us WHERE us.loginTime >= :since")
    Long countSessionsInPeriod(@Param("since") LocalDateTime since);

    @Query("SELECT us FROM UserSession us WHERE us.userId = :userId ORDER BY us.loginTime DESC")
    List<UserSession> findByUserIdOrderByLoginTimeDesc(@Param("userId") Long userId);

    @Query("SELECT us FROM UserSession us WHERE us.isActive = true ORDER BY us.lastActivity DESC")
    List<UserSession> findActiveSessionsOrderByActivity();

    @Query("SELECT AVG(us.sessionDurationMinutes) FROM UserSession us WHERE us.sessionDurationMinutes IS NOT NULL AND us.loginTime >= :since")
    Double getAverageSessionDuration(@Param("since") LocalDateTime since);

    @Query("SELECT us.userId, COUNT(us) as sessionCount FROM UserSession us WHERE us.loginTime >= :since GROUP BY us.userId ORDER BY sessionCount DESC")
    List<Object[]> getMostActiveUsers(@Param("since") LocalDateTime since);

    @Query("SELECT DATE(us.loginTime) as loginDate, COUNT(DISTINCT us.userId) as uniqueUsers, COUNT(us) as totalSessions " +
           "FROM UserSession us WHERE us.loginTime >= :since GROUP BY DATE(us.loginTime) ORDER BY loginDate DESC")
    List<Object[]> getDailyUserStats(@Param("since") LocalDateTime since);
}