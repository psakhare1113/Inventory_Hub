-- ============================================================
-- Migration: warehouse_locations table cleanup
-- 1. Remove unused optional columns
-- 2. Fix is_available default value
-- 3. Fix updated_at auto-update on row change
-- ============================================================

USE warehouse_db;

-- Step 1: Drop unused columns
ALTER TABLE warehouse_locations
    DROP COLUMN hazmat_approved,
    DROP COLUMN temperature_controlled,
    DROP COLUMN max_weight,
    DROP COLUMN max_height,
    DROP COLUMN preferred_product_id,
    DROP COLUMN preferred_category_id;

-- Step 2: Fix is_available — set existing NULLs to true and add DEFAULT
UPDATE warehouse_locations SET is_available = 1 WHERE is_available IS NULL;
ALTER TABLE warehouse_locations
    MODIFY COLUMN is_available TINYINT(1) NOT NULL DEFAULT 1;

-- Step 3: Fix updated_at — set DEFAULT NULL (only populated on UPDATE)
ALTER TABLE warehouse_locations
    MODIFY COLUMN updated_at DATETIME(6) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6);

-- Step 4: updated_by stays NULL until someone actually updates the row (correct behavior)
-- No change needed — NULL means "never updated", which is accurate

-- Verify
SELECT id, location_code, is_available, is_active, updated_at, updated_by
FROM warehouse_locations
LIMIT 5;
