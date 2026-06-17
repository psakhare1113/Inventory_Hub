package com.pixelbloom.products.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "image_url")
    private String imageUrl;

    // GST rate for this category (Indian GST slabs: 0, 5, 12, 18, 28)
    @Column(name = "gst_rate", nullable = false)
    private BigDecimal gstRate = BigDecimal.valueOf(12.00);
}
