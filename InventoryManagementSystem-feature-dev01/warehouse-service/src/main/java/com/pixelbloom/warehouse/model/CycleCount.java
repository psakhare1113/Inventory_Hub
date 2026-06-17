package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.pixelbloom.warehouse.enums.CycleCountStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Cycle Count for inventory reconciliation (FR-100 to FR-101)
 */
@Entity
@Table(name = "cycle_counts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class CycleCount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String cycleCountNumber; // e.g., "CC-2026-00001"

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private CycleCountStatus status;

    @Column(nullable = false)
    private Long warehouseId;

    private Long locationId; // Null for full warehouse count

    @Column(nullable = false)
    private LocalDate scheduledDate;

    @Column(nullable = false, length = 50)
    private String countType; // FULL, LOCATION, PRODUCT, ABC_CLASS

    // ABC Classification filter (if applicable)
    @Column(length = 10)
    private String abcClass; // A, B, C

    // Execution tracking
    private Long countedBy;
    private LocalDateTime countStartedAt;
    private LocalDateTime countCompletedAt;

    // Approval tracking
    private Long approvedBy;
    private LocalDateTime approvedAt;

    @Column(length = 500)
    private String notes;

    @OneToMany(mappedBy = "cycleCount", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<CycleCountLine> lines = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    private Long createdBy;

    /**
     * Check if count has variances
     */
    public boolean hasVariances() {
        return lines.stream().anyMatch(line -> line.getVariance() != 0);
    }

    /**
     * Get total variance count
     */
    public long getVarianceCount() {
        return lines.stream().filter(line -> line.getVariance() != 0).count();
    }
}
