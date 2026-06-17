package com.pixelbloom.products.service;

import com.pixelbloom.products.model.ProductAttribute;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
@Repository
public interface ProductAttributeService {

    Map<String, String> getAttributes(Long productId);
    
    List<ProductAttribute> getAttributesList(Long productId);

    void saveAttributes(Long productId, Map<String, String> attributes);
    
    void saveAttribute(ProductAttribute attribute);

    List<Long> filterProducts(Map<String, String> filters);
}
