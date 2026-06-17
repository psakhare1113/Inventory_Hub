package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.ProductBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductBatchRepository extends JpaRepository<ProductBatch, Long> {

    List<ProductBatch> findByProductId(Long productId);

    List<ProductBatch> findByProductIdAndStatus(Long productId, String status);

    Optional<ProductBatch> findByBatchNumber(String batchNumber);

    Optional<ProductBatch> findByProductIdAndBatchNumber(Long productId, String batchNumber);

    List<ProductBatch> findBySupplierId(Long supplierId);

    @Query("SELECT pb FROM ProductBatch pb WHERE pb.expiryDate <= :date AND pb.status = 'ACTIVE'")
    List<ProductBatch> findExpiringBefore(LocalDate date);

    @Query("SELECT pb FROM ProductBatch pb WHERE pb.expiryDate BETWEEN :startDate AND :endDate AND pb.status = 'ACTIVE'")
    List<ProductBatch> findExpiringBetween(LocalDate startDate, LocalDate endDate);

    @Query("SELECT pb FROM ProductBatch pb WHERE pb.productId = :productId ORDER BY pb.expiryDate ASC")
    List<ProductBatch> findByProductIdOrderByExpiryDateAsc(Long productId);

    boolean existsByBatchNumber(String batchNumber);

    boolean existsByProductIdAndBatchNumber(Long productId, String batchNumber);

    @Query("SELECT COUNT(pb) FROM ProductBatch pb WHERE pb.productId = :productId AND pb.status = 'ACTIVE'")
    long countActiveBatchesByProductId(Long productId);
}
