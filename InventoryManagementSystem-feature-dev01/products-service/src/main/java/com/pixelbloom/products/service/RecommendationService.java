package com.pixelbloom.products.service;

import com.pixelbloom.products.model.Product;
import com.pixelbloom.products.model.UserVisit;

import java.util.List;

public interface RecommendationService {
    
    void trackVisit(Long userId, Long productId, Long categoryId, Long subcategoryId);
    
    List<Product> getRecommendationsBasedOnVisits(Long userId, int limit);
    
    List<Product> getRecommendationsForGuest(Long productId, Long categoryId, Long subcategoryId, int limit);
}