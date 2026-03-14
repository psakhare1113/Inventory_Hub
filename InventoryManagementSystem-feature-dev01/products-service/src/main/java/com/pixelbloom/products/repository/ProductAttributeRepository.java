package com.pixelbloom.products.repository;

import com.pixelbloom.products.model.ProductAttribute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductAttributeRepository
        extends JpaRepository<ProductAttribute, Long> {

    List<ProductAttribute> findByProductId(Long productId);
    
    void deleteByProductId(Long productId);
    
    @Query("""
        SELECT pa.productId
        FROM ProductAttribute pa
        WHERE pa.name = :name AND pa.value = :value
    """)
    List<Long> findProductIdsByAttribute(
            @Param("name") String name,
            @Param("value") String value
    );
}


