-- Fix existing return pickup tasks that were created with RETURN_PICKUP_PENDING
-- before admin approval. Reset them to RETURN_PICKUP_AWAITING_APPROVAL so they
-- are hidden from the delivery boy until admin explicitly approves the return.
--
-- Run this ONCE after deploying the new DeliveryStatus enum.
-- Only affects tasks where the return is still RETURN_INITIATED (not yet approved).

UPDATE delivery_assignments da
INNER JOIN returns r ON r.return_reference = da.return_reference
SET da.delivery_status = 'RETURN_PICKUP_AWAITING_APPROVAL'
WHERE da.is_return_pickup_task = 1
  AND da.delivery_status = 'RETURN_PICKUP_PENDING'
  AND r.return_status = 'RETURN_INITIATED';
