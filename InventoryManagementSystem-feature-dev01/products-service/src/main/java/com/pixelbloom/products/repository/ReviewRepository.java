package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByProductIdIn(List<Long> productIds);

    Optional<Review> findByProductIdAndCustomerId(Long productId,Long customerId);

    @Query(""" 
        SELECT AVG(r.rating), COUNT(r) FROM Review r WHERE r.productId = :productId""")
    Object[] getRatingStats(Long productId);
}
