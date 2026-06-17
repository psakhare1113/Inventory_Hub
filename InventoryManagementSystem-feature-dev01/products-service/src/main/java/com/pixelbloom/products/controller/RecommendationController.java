package com.pixelbloom.products.controller;

import com.pixelbloom.products.model.Product;
import com.pixelbloom.products.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @PostMapping("/track-visit")
    public ResponseEntity<Void> trackVisit(
            @RequestParam(required = false) Long userId,
            @RequestParam Long productId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long subcategoryId) {
        
        recommendationService.trackVisit(userId, productId, categoryId, subcategoryId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Product>> getUserRecommendations(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "8") int limit) {
        
        List<Product> recommendations = recommendationService.getRecommendationsBasedOnVisits(userId, limit);
        return ResponseEntity.ok(recommendations);
    }

    @GetMapping("/guest")
    public ResponseEntity<List<Product>> getGuestRecommendations(
            @RequestParam Long productId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long subcategoryId,
            @RequestParam(defaultValue = "8") int limit) {
        
        List<Product> recommendations = recommendationService.getRecommendationsForGuest(
                productId, categoryId, subcategoryId, limit);
        return ResponseEntity.ok(recommendations);
    }
}