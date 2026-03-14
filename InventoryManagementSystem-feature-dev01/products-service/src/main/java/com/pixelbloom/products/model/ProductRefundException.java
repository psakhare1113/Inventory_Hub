package com.pixelbloom.products.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "product_refund_exceptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRefundException {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long productId;

    @Column(nullable = false)
    private Boolean refundable;

    private String reason; // "Customized item", "Final sale", etc.

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
}
