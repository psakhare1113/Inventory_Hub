package com.pixelbloom.products.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "category_attributes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoryAttribute {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "category_id", nullable = false)
    private Long categoryId;
    
    @Column(name = "attribute_name", nullable = false)
    private String attributeName;
    
    @Column(name = "is_required")
    private Boolean isRequired = false;
    
    @Column(name = "display_order")
    private Integer displayOrder = 0;
}