package com.pixelbloom.products.service;

import com.pixelbloom.products.response.CompareResponse;

import java.util.List;

public interface CompareService {
    CompareResponse compare(
            Long subcategoryId,
            List<Long> productIds,
            Long customerId
    );
}
