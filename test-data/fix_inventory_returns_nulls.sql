-- Fix NULL fields in inventory_returns table
-- This script updates existing records with NULL values
-- Compatible with MySQL safe update mode
-- Note: The column name is 'status', not 'return_status'

-- Disable safe update mode temporarily for this session
SET SQL_SAFE_UPDATES = 0;

-- Update approved field to false where it's NULL
UPDATE inventorydb.inventory_returns
SET approved = false
WHERE approved IS NULL;

-- Update damage_declared to false where it's NULL (assuming no damage was declared if not specified)
UPDATE inventorydb.inventory_returns
SET damage_declared = false
WHERE damage_declared IS NULL;

-- Update inspected_by to 'SYSTEM' where it's NULL and status is not RETURN_INITIATED
UPDATE inventorydb.inventory_returns
SET inspected_by = 'SYSTEM'
WHERE inspected_by IS NULL 
  AND status != 'RETURN_INITIATED';

-- Update inspected_at to updated_at where it's NULL and status is not RETURN_INITIATED
UPDATE inventorydb.inventory_returns
SET inspected_at = updated_at
WHERE inspected_at IS NULL 
  AND status != 'RETURN_INITIATED';

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

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
    transaction_id,
    return_reason,
    damage_declared,
    damage_reason,
    created_at,
    updated_at
FROM inventorydb.inventory_returns
ORDER BY created_at DESC
LIMIT 20;
