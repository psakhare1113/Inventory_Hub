-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(500)
);

-- Create subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id BIGINT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Insert default categories with images
INSERT INTO categories (name, image_url) VALUES
('Living Room', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'),
('Dining Room', 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400'),
('Bedroom', 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400'),
('Office', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400'),
('Lighting', 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400'),
('Decor', 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=400');
