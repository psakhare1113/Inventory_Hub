-- ============================================================
-- Fix: Reassign all inventory items to Kolhapur Warehouse
-- ------------------------------------------------------------
-- Problem: Inventory items have warehouse_id pointing to a
--          warehouse (e.g. Nagpur) that no longer exists in
--          warehouse_db.warehouses. The only active warehouse
--          is Kolhapur, so all items must point to it.
--
-- Run this script once against MySQL.
-- Both databases must be on the same MySQL instance.
-- ============================================================

-- Step 1: Get the Kolhapur warehouse ID from warehouse_db
-- (Run this SELECT first to confirm the ID before updating)
SELECT id, name, city, is_active
FROM warehouse_db.warehouses
WHERE city = 'Kolhapur' OR name LIKE '%Kolhapur%'
LIMIT 5;

-- Step 2: Update ALL inventory items to use the Kolhapur warehouse ID
SET SQL_SAFE_UPDATES = 0;

UPDATE inventoryDB.inventory
SET warehouse_id = (
    SELECT id
    FROM warehouse_db.warehouses
    WHERE (city = 'Kolhapur' OR name LIKE '%Kolhapur%')
      AND is_active = 1
    ORDER BY id ASC
    LIMIT 1
)
WHERE warehouse_id IS NULL
   OR warehouse_id NOT IN (SELECT id FROM warehouse_db.warehouses);

SET SQL_SAFE_UPDATES = 1;

-- Step 3: Verify — all rows should now reference the Kolhapur warehouse
SELECT
    i.warehouse_id,
    w.name AS warehouse_name,
    w.city,
    COUNT(*) AS item_count
FROM inventoryDB.inventory i
LEFT JOIN warehouse_db.warehouses w ON i.warehouse_id = w.id
GROUP BY i.warehouse_id, w.name, w.city;
