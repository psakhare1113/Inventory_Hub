package com.pixelbloom.warehouse.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.pixelbloom.warehouse.enums.GRNStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Goods Receipt Note (GRN) - FR-30 to FR-33
 */
@Entity
@Table(name = "goods_receipt_notes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class GoodsReceiptNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String grnNumber; // e.g., "GRN-2026-00001"

    @Column(nullable = false)
    private Long poId;

    @Column(nullable = false)
    private Long warehouseId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private GRNStatus status;

    @Column(nullable = false)
    private LocalDateTime receivedAt;

    private Long receivedBy;

    // Quality inspection
    private Long inspectedBy;
    private LocalDateTime inspectedAt;
    private String inspectionNotes;

    // Putaway tracking
    @Builder.Default
    private Boolean putawayCompleted = false;
    private LocalDateTime putawayCompletedAt;

    @Column(length = 500)
    private String notes;

    @OneToMany(mappedBy = "grn", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<GRNLine> lines = new ArrayList<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /**
     * Check if all lines are putaway
     */
    public boolean isAllLinesPutaway() {
        return lines.stream().allMatch(GRNLine::getPutawayCompleted);
    }
}
