package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.ProductRatingSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRatingSummaryRepository
        extends JpaRepository<ProductRatingSummary, Long> {


}
