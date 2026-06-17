CREATE TABLE user_visits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    product_id BIGINT NOT NULL,
    category_id BIGINT,
    subcategory_id BIGINT,
    visit_count INT NOT NULL DEFAULT 1,
    last_visited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_product (user_id, product_id),
    INDEX idx_user_last_visited (user_id, last_visited_at),
    INDEX idx_product_id (product_id),
    INDEX idx_category_id (category_id),
    INDEX idx_subcategory_id (subcategory_id)
);