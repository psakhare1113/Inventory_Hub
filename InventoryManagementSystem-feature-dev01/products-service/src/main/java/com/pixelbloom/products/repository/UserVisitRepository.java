package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.UserVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserVisitRepository extends JpaRepository<UserVisit, Long> {

    Optional<UserVisit> findByUserIdAndProductId(Long userId, Long productId);

    @Query("SELECT uv FROM UserVisit uv WHERE uv.userId = :userId ORDER BY uv.lastVisitedAt DESC")
    List<UserVisit> findByUserIdOrderByLastVisitedAtDesc(@Param("userId") Long userId);

    @Query("SELECT uv FROM UserVisit uv WHERE uv.userId = :userId AND uv.lastVisitedAt >= :since ORDER BY uv.visitCount DESC, uv.lastVisitedAt DESC")
    List<UserVisit> findRecentVisitsByUser(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT DISTINCT uv.categoryId FROM UserVisit uv WHERE uv.userId = :userId AND uv.categoryId IS NOT NULL ORDER BY MAX(uv.lastVisitedAt) DESC")
    List<Long> findTopCategoriesByUser(@Param("userId") Long userId);

    @Query("SELECT DISTINCT uv.subcategoryId FROM UserVisit uv WHERE uv.userId = :userId AND uv.subcategoryId IS NOT NULL ORDER BY MAX(uv.lastVisitedAt) DESC")
    List<Long> findTopSubcategoriesByUser(@Param("userId") Long userId);
}