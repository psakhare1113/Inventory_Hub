package com.pixelbloom.products.request;
import com.pixelbloom.products.enums.ProductStatus;
import lombok.Data;

@Data
public class ProductCreateRequest {
    private String productBarcode;
    private String name;
    private String description;
    private Long categoryId;
    private Long subcategoryId;
    private ProductStatus status;
    private String productUrl;
    private boolean eligibleForReturn = true;
}