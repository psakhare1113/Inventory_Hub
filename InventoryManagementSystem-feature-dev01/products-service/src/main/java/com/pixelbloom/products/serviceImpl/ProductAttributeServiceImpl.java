package com.pixelbloom.products.serviceImpl;

import com.pixelbloom.products.model.ProductAttribute;
import com.pixelbloom.products.repository.ProductAttributeRepository;
import com.pixelbloom.products.service.ProductAttributeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductAttributeServiceImpl implements ProductAttributeService {

    private final ProductAttributeRepository repository;

    @Override
    public Map<String, String> getAttributes(Long productId) {

        return repository.findByProductId(productId)
                .stream()
                .collect(Collectors.toMap(
                        ProductAttribute::getName,
                        ProductAttribute::getValue
                ));
    }

    @Override
    public void saveAttributes(Long productId,Map<String, String> attributes) {
        // delete old attributes
        repository.deleteAll(repository.findByProductId(productId));
        // save new ones
        attributes.forEach((key, value) -> {
            ProductAttribute attr = new ProductAttribute();
            attr.setProductId(productId);
            attr.setName(key);
            attr.setValue(value);
            repository.save(attr);
        });
    }

    @Override
    public List<Long> filterProducts(Map<String, String> filters) {

        List<Long> result = null;

        for (Map.Entry<String, String> entry : filters.entrySet()) {

            List<Long> productIds =
                    repository.findProductIdsByAttribute(
                            entry.getKey(),
                            entry.getValue()
                    );

            if (result == null) {
                result = productIds;
            } else {
                result.retainAll(productIds); // AND condition
            }
        }

        return result == null ? List.of() : result;
    }


}