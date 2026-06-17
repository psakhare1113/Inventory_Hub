-- Create shipping database
CREATE DATABASE IF NOT EXISTS shippingdb;
USE shippingdb;

-- Create packages table (tracks packing records per order)
CREATE TABLE IF NOT EXISTS packages (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_number        VARCHAR(255) NOT NULL UNIQUE,
    customer_id         BIGINT,
    weight_kg           DOUBLE,
    length_cm           DOUBLE,
    width_cm            DOUBLE,
    height_cm           DOUBLE,
    packing_slip_number VARCHAR(100),
    packed_by           VARCHAR(100),
    notes               TEXT,
    status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    packed_at           TIMESTAMP NULL,
    shipped_at          TIMESTAMP NULL,
    delivered_at        TIMESTAMP NULL
);

-- Create customer_addresses table
CREATE TABLE IF NOT EXISTS customer_addresses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    contact_phone VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for testing
INSERT INTO customer_addresses (customer_id, address_line1, address_line2, city, state, zip_code, country, contact_phone, is_default) VALUES
(1, '123 Main Street', 'Apt 4B', 'Mumbai', 'Maharashtra', '400001', 'India', '+91 98765 43210', true),
(2, '456 Park Avenue', NULL, 'Delhi', 'Delhi', '110001', 'India', '+91 87654 32109', true),
(1, '789 Oak Road', 'Floor 2', 'Pune', 'Maharashtra', '411001', 'India', '+91 76543 21098', false);