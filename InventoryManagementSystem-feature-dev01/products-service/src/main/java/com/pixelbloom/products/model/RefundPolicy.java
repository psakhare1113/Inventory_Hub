package com.pixelbloom.products.model;

import com.pixelbloom.products.enums.PolicyLevel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "refund_policies")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundPolicy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long categoryId;
    private Long subcategoryId; // nullable for category-level rules

    @Column(nullable = false)
    private Boolean refundable;

    private Integer refundWindowDays; // e.g., 7, 15, 30 days

    private String reason; // "Perishable item", "Hygiene product", etc.

    @Enumerated(EnumType.STRING)
    private PolicyLevel level; // CATEGORY or SUBCATEGORY

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
}
