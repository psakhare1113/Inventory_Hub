-- Fix: delivery_status column size वाढवा
-- RETURN_PICKUP_PENDING = 22 chars, जुना column VARCHAR(20) किंवा कमी असेल
-- हे MySQL Workbench किंवा terminal मध्ये run करा

USE ordersDB;

ALTER TABLE delivery_assignments
  MODIFY COLUMN delivery_status VARCHAR(50) NOT NULL;

-- Verify
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'ordersDB'
  AND TABLE_NAME   = 'delivery_assignments'
  AND COLUMN_NAME  = 'delivery_status';
