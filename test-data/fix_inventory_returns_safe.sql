-- Fix NULL fields in inventory_returns table (Safe Mode Compatible)
-- This script uses primary key (id) in WHERE clause to satisfy safe update mode
-- Alternative approach without disabling safe mode
-- Note: The column name is 'status', not 'return_status'

USE inventorydb;

-- First, let's see which records need updating
SELECT 
    id,
    barcode,
    status,
    approved,
    damage_declared,
    inspected_by,
    inspected_at
FROM inventory_returns
WHERE approved IS NULL 
   OR damage_declared IS NULL 
   OR (inspected_by IS NULL AND status != 'RETURN_INITIATED')
   OR (inspected_at IS NULL AND status != 'RETURN_INITIATED');

-- Update using subquery with primary key (safe mode compatible)
-- 1. Fix approved field
UPDATE inventory_returns
SET approved = false
WHERE id IN (
    SELECT id FROM (
        SELECT id FROM inventory_returns WHERE approved IS NULL
    ) AS temp
);

-- 2. Fix damage_declared field
UPDATE inventory_returns
SET damage_declared = false
WHERE id IN (
    SELECT id FROM (
        SELECT id FROM inventory_returns WHERE damage_declared IS NULL
    ) AS temp
);

-- 3. Fix inspected_by field
UPDATE inventory_returns
SET inspected_by = 'SYSTEM'
WHERE id IN (
    SELECT id FROM (
        SELECT id FROM inventory_returns 
        WHERE inspected_by IS NULL 
          AND status != 'RETURN_INITIATED'
    ) AS temp
);

-- 4. Fix inspected_at field
UPDATE inventory_returns
SET inspected_at = updated_at
WHERE id IN (
    SELECT id FROM (
        SELECT id FROM inventory_returns 
        WHERE inspected_at IS NULL 
          AND status != 'RETURN_INITIATED'
    ) AS temp
);

-- Verify the changes
SELECT 
    id,
    return_reference,
    barcode,
    order_number,
    status,
    approved,
    inspection_id,
    inspected_by,
    inspected_at,
    damage_declared,
    damage_reason
FROM inventory_returns
ORDER BY created_at DESC
LIMIT 20;

-- Check if any NULL values remain
SELECT 
    COUNT(*) as total_records,
    SUM(CASE WHEN approved IS NULL THEN 1 ELSE 0 END) as null_approved,
    SUM(CASE WHEN damage_declared IS NULL THEN 1 ELSE 0 END) as null_damage_declared,
    SUM(CASE WHEN inspected_by IS NULL AND status != 'RETURN_INITIATED' THEN 1 ELSE 0 END) as null_inspected_by,
    SUM(CASE WHEN inspected_at IS NULL AND status != 'RETURN_INITIATED' THEN 1 ELSE 0 END) as null_inspected_at
FROM inventory_returns;
