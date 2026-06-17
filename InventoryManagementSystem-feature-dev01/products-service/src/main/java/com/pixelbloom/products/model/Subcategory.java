package com.pixelbloom.products.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "subcategories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Subcategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /**
     * Root category this subcategory belongs to.
     * For sub-subcategories (level 3), this still holds the top-level category id
     * so products can always filter by root category.
     * Nullable for sub-subcategories that are created under a subcategory directly.
     */
    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "image_url")
    private String imageUrl;

    /**
     * If set, this entry is a sub-subcategory (level 3).
     * Points to the parent Subcategory id.
     * NULL means this is a regular subcategory (level 2).
     *
     * Example:
     *   Electronics (Category, level 1)
     *     └── Mobile Phones (Subcategory, level 2, parentSubcategoryId = null)
     *           ├── Samsung  (Sub-Subcategory, level 3, parentSubcategoryId = Mobile Phones id)
     *           └── Apple    (Sub-Subcategory, level 3, parentSubcategoryId = Mobile Phones id)
     */
    @Column(name = "parent_subcategory_id")
    private Long parentSubcategoryId;
}
