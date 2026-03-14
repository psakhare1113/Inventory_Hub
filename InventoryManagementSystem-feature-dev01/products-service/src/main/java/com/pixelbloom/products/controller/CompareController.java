package com.pixelbloom.products.controller;

import com.pixelbloom.products.response.CompareResponse;
import com.pixelbloom.products.service.CompareService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class CompareController {

    private final CompareService compareService;

    public CompareController(CompareService compareService) {
        this.compareService = compareService;
    }

    @GetMapping("/compare")
    public CompareResponse compare(
            @RequestParam Long subcategoryId,
            @RequestParam List<Long> productIds,
            @RequestParam(required = false) Long customerId) {

        return compareService.compare(subcategoryId, productIds, customerId);
    }
}