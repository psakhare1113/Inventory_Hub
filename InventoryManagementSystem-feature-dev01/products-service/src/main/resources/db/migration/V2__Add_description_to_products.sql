-- Add description column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT AFTER name;