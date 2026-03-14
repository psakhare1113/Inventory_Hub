package com.pixelbloom.products.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "product_attributes")
public class ProductAttribute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long productId;
    private String name;
    private String value;

   }