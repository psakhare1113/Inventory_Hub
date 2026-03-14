package com.pixelbloom.orders.repository;
import com.pixelbloom.orders.model.Pricing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PricingRepository extends JpaRepository<Pricing, Long> {

    Optional<Pricing> findTopByProductIdOrderByEffectiveDateDesc(Long productId);
}