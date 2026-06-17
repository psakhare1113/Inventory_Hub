package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.enums.ProductStatus;
import com.pixelbloom.products.model.Product;
import com.pixelbloom.products.model.UserVisit;
import com.pixelbloom.products.repository.ProductRepository;
import com.pixelbloom.products.repository.UserVisitRepository;
import com.pixelbloom.products.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationServiceImpl implements RecommendationService {

    private final UserVisitRepository userVisitRepository;
    private final ProductRepository productRepository;

    @Override
    @Transactional
    public void trackVisit(Long userId, Long productId, Long categoryId, Long subcategoryId) {
        if (userId == null || productId == null) return;

        Optional<UserVisit> existingVisit = userVisitRepository.findByUserIdAndProductId(userId, productId);
        
        if (existingVisit.isPresent()) {
            UserVisit visit = existingVisit.get();
            visit.setVisitCount(visit.getVisitCount() + 1);
            visit.setLastVisitedAt(LocalDateTime.now());
            userVisitRepository.save(visit);
        } else {
            UserVisit newVisit = new UserVisit();
            newVisit.setUserId(userId);
            newVisit.setProductId(productId);
            newVisit.setCategoryId(categoryId);
            newVisit.setSubcategoryId(subcategoryId);
            newVisit.setVisitCount(1);
            newVisit.setLastVisitedAt(LocalDateTime.now());
            userVisitRepository.save(newVisit);
        }
    }

    @Override
    public List<Product> getRecommendationsBasedOnVisits(Long userId, int limit) {
        if (userId == null) return List.of();

        // Get user's recent visits (last 30 days)
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<UserVisit> recentVisits = userVisitRepository.findRecentVisitsByUser(userId, thirtyDaysAgo);
        
        if (recentVisits.isEmpty()) {
            // Fallback to popular products
            return productRepository.findByStatusOrderByProductIdDesc(ProductStatus.ACTIVE, PageRequest.of(0, limit));
        }

        // Get top categories and subcategories from user visits
        List<Long> topCategories = userVisitRepository.findTopCategoriesByUser(userId);
        List<Long> topSubcategories = userVisitRepository.findTopSubcategoriesByUser(userId);
        
        // Get visited product IDs to exclude them
        List<Long> visitedProductIds = recentVisits.stream()
                .map(UserVisit::getProductId)
                .collect(Collectors.toList());

        List<Product> recommendations = List.of();
        
        // Try to get products from user's preferred subcategories
        if (!topSubcategories.isEmpty()) {
            recommendations = productRepository.findBySubcategoryIdInAndStatusAndProductIdNotIn(
                    topSubcategories, ProductStatus.ACTIVE, visitedProductIds, PageRequest.of(0, limit));
        }
        
        // If not enough, try categories
        if (recommendations.size() < limit && !topCategories.isEmpty()) {
            int remaining = limit - recommendations.size();
            List<Product> categoryProducts = productRepository.findByCategoryIdInAndStatusAndProductIdNotIn(
                    topCategories, ProductStatus.ACTIVE, visitedProductIds, PageRequest.of(0, remaining));
            recommendations = recommendations.stream()
                    .collect(Collectors.toList());
            recommendations.addAll(categoryProducts);
        }
        
        // Fill remaining with popular products
        if (recommendations.size() < limit) {
            int remaining = limit - recommendations.size();
            List<Product> popularProducts = productRepository.findByStatusAndProductIdNotIn(
                    ProductStatus.ACTIVE, visitedProductIds, PageRequest.of(0, remaining));
            recommendations.addAll(popularProducts);
        }

        return recommendations.stream().limit(limit).collect(Collectors.toList());
    }

    @Override
    public List<Product> getRecommendationsForGuest(Long productId, Long categoryId, Long subcategoryId, int limit) {
        // For guests, recommend similar products from same subcategory/category
        List<Product> recommendations = List.of();
        
        if (subcategoryId != null) {
            recommendations = productRepository.findBySubcategoryIdAndStatusAndProductIdNot(
                    subcategoryId, ProductStatus.ACTIVE, productId, PageRequest.of(0, limit));
        }
        
        if (recommendations.size() < limit && categoryId != null) {
            int remaining = limit - recommendations.size();
            List<Product> categoryProducts = productRepository.findByCategoryIdAndStatusAndProductIdNot(
                    categoryId, ProductStatus.ACTIVE, productId, PageRequest.of(0, remaining));
            recommendations = recommendations.stream().collect(Collectors.toList());
            recommendations.addAll(categoryProducts);
        }
        
        // Fill with popular products if needed
        if (recommendations.size() < limit) {
            int remaining = limit - recommendations.size();
            List<Product> popularProducts = productRepository.findByStatusAndProductIdNot(
                    ProductStatus.ACTIVE, productId, PageRequest.of(0, remaining));
            recommendations.addAll(popularProducts);
        }

        return recommendations.stream().limit(limit).collect(Collectors.toList());
    }
}