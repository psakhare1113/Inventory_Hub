package com.pixelbloom.orders.enums;

public enum DeliveryStatus {
    /** Order assigned to delivery boy, not yet picked up */
    ASSIGNED,

    /** Delivery boy picked up from warehouse */
    PICKED_UP,

    /** Out for delivery to customer */
    OUT_FOR_DELIVERY,

    /** Successfully delivered to customer */
    DELIVERED,

    /** Delivery failed (customer not available, wrong address, etc.) */
    FAILED,

    /** Reassigned to another delivery boy */
    REASSIGNED,

    /**
     * Cash refund task — delivery boy needs to visit customer and hand back cash.
     * Created automatically when customer selects refundMethod=CASH.
     */
    CASH_REFUND_PENDING,

    /** Delivery boy has handed cash back to customer */
    CASH_REFUND_DONE,

    /**
     * Return pickup task — delivery boy needs to visit customer and collect the returned item.
     * Created automatically when a customer initiates a return (RETURN_INITIATED).
     */
    RETURN_PICKUP_PENDING,

    /**
     * Return pickup task created but waiting for admin to approve the return request.
     * Delivery boy cannot see this task yet — only visible after admin approves.
     */
    RETURN_PICKUP_AWAITING_APPROVAL,

    /** Delivery boy has collected the item from customer and completed the return pickup */
    RETURN_PICKUP_DONE
}
