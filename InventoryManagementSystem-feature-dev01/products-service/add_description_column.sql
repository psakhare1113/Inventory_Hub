-- Add description column to products table if it doesn't exist
-- Run this SQL script in your MySQL database: imsproductsdb

USE imsproductsdb;

-- Check if description column exists, if not add it
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'imsproductsdb' 
AND table_name = 'products' 
AND column_name = 'description';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE products ADD COLUMN description TEXT AFTER name;', 
    'SELECT "Description column already exists" as message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column was added
DESCRIBE products;