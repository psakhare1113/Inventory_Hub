package com.pixelbloom.products.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Option A — Admin-defined complementary subcategory pairs.
 *
 * Example rows:
 *   subcategoryId=6 (Mobile Phones) → complementarySubcategoryId=7  (Watch)
 *   subcategoryId=6 (Mobile Phones) → complementarySubcategoryId=8  (Earphones)
 *   subcategoryId=7 (Watch)         → complementarySubcategoryId=6  (Mobile Phones)
 *
 * Bidirectional: if A→B exists, B→A should also exist (admin adds both).
 */
@Entity
@Table(
    name = "subcategory_complementary_map",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"subcategory_id", "complementary_subcategory_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubcategoryComplementaryMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The source subcategory */
    @Column(name = "subcategory_id", nullable = false)
    private Long subcategoryId;

    /** The complementary subcategory (accessories, add-ons) */
    @Column(name = "complementary_subcategory_id", nullable = false)
    private Long complementarySubcategoryId;

    /** Optional label shown in UI e.g. "Accessories", "Frequently Bought Together" */
    @Column(name = "label")
    private String label;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
