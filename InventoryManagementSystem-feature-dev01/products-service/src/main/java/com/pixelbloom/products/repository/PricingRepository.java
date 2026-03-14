package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.Pricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PricingRepository
        extends JpaRepository<Pricing, Long> {

    List<Pricing> findByProductIdIn(List<Long> productIds);

    List<Pricing> findByProductId(Long productId);
}
