-- Diagnostic queries for inventory_returns table
-- Run these to understand the current state of your data

-- 1. Show the actual column names in the table
DESCRIBE inventorydb.inventory_returns;

-- 2. Count NULL values in each important column
SELECT 
    COUNT(*) as total_records,
    SUM(CASE WHEN inspection_id IS NULL THEN 1 ELSE 0 END) as null_inspection_id,
    SUM(CASE WHEN approved IS NULL THEN 1 ELSE 0 END) as null_approved,
    SUM(CASE WHEN rejection_reason IS NULL THEN 1 ELSE 0 END) as null_rejection_reason,
    SUM(CASE WHEN inspected_at IS NULL THEN 1 ELSE 0 END) as null_inspected_at,
    SUM(CASE WHEN inspected_by IS NULL THEN 1 ELSE 0 END) as null_inspected_by,
    SUM(CASE WHEN transaction_id IS NULL THEN 1 ELSE 0 END) as null_transaction_id,
    SUM(CASE WHEN damage_declared IS NULL THEN 1 ELSE 0 END) as null_damage_declared,
    SUM(CASE WHEN damage_reason IS NULL THEN 1 ELSE 0 END) as null_damage_reason
FROM inventorydb.inventory_returns;

-- 3. Show records with NULL values (most recent 10)
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
    transaction_id,
    return_reason,
    damage_declared,
    damage_reason,
    created_at,
    updated_at
FROM inventorydb.inventory_returns
WHERE approved IS NULL 
   OR damage_declared IS NULL
   OR (inspected_by IS NULL AND status != 'RETURN_INITIATED')
   OR (inspected_at IS NULL AND status != 'RETURN_INITIATED')
ORDER BY created_at DESC
LIMIT 10;

-- 4. Show all records grouped by status
SELECT 
    status,
    COUNT(*) as count,
    SUM(CASE WHEN approved IS NULL THEN 1 ELSE 0 END) as null_approved,
    SUM(CASE WHEN damage_declared IS NULL THEN 1 ELSE 0 END) as null_damage_declared
FROM inventorydb.inventory_returns
GROUP BY status
ORDER BY status;

-- 5. Show the most recent 10 records
SELECT 
    id,
    return_reference,
    barcode,
    order_number,
    status,
    approved,
    damage_declared,
    created_at
FROM inventorydb.inventory_returns
ORDER BY created_at DESC
LIMIT 10;
