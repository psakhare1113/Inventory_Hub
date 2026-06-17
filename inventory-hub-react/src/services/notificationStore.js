/**
 * notificationStore.js
 *
 * Shared notification store using localStorage.
 * Warehouse actions → push notifications → Admin panel reads them.
 * Also used for warehouse-internal notifications.
 *
 * Storage key: 'ims_notifications'
 * Format: Array of notification objects
 *
 * Cross-tab sync: BroadcastChannel API — same browser, different tabs
 * automatically receive notifications.
 */

const STORAGE_KEY = 'ims_notifications';
const MAX_NOTIFICATIONS = 100;

// ── BroadcastChannel — for syncing across different tabs ─────────────────────
const _channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('ims_notifications_channel')
  : null;

// Listen for messages from other tabs → fire same-tab event
if (_channel) {
  _channel.onmessage = (event) => {
    if (event.data?.type === 'ims_notification_update') {
      // localStorage already updated by the other tab
      // Just fire a UI refresh event
      window.dispatchEvent(new CustomEvent('ims_notification_update'));
    }
  };
}

// ── Read all notifications ────────────────────────────────────────────────────
export const getNotifications = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// ── Save notifications array ──────────────────────────────────────────────────
const saveNotifications = (list) => {
  try {
    // Keep only latest MAX_NOTIFICATIONS
    const trimmed = list.slice(0, MAX_NOTIFICATIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    // Same tab refresh event
    window.dispatchEvent(new CustomEvent('ims_notification_update'));
    // Notify different tabs via BroadcastChannel
    _channel?.postMessage({ type: 'ims_notification_update' });
  } catch { /* ignore storage errors */ }
};

// ── Push a new notification ───────────────────────────────────────────────────
export const pushNotification = ({ type, title, message, source = 'SYSTEM', ...extra }) => {
  const existing = getNotifications();

  // ── Deduplication guard ───────────────────────────────────────────────────
  // Same type + same title within last 10 seconds → it's a duplicate, skip
  // This protects against cross-tab BroadcastChannel sync, multiple WebSocket subscribers,
  // and double-push bugs.
  const tenSec = Date.now() - 10000;
  const isDupe = existing.some(n => {
    if (new Date(n.time).getTime() <= tenSec) return false;
    if (n.type !== type) return false;
    // Same title → definite duplicate
    if (n.title === title) return true;
    // Same orderNumber in data → same event, different title wording
    const newOrderNum  = extra?.data?.orderNumber || extra?.orderId;
    const existOrderNum = n.data?.orderNumber || n.orderId;
    if (newOrderNum && existOrderNum && newOrderNum === existOrderNum) return true;
    return false;
  });
  if (isDupe) return existing[0]; // return most recent match, do not push new
  // ─────────────────────────────────────────────────────────────────────────

  const newNotif = {
    id:      Date.now() + Math.random(),
    type,
    title,
    message,
    source,
    time:    new Date().toISOString(),
    read:    false,
    ...extra, // ← pickListData and any other extra fields
  };
  saveNotifications([newNotif, ...existing]);
  return newNotif;
};

// ── Mark one as read ──────────────────────────────────────────────────────────
export const markRead = (id) => {
  const list = getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
  saveNotifications(list);
};

// ── Mark all as read ──────────────────────────────────────────────────────────
export const markAllRead = () => {
  const list = getNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(list);
};

// ── Delete one ────────────────────────────────────────────────────────────────
export const deleteNotification = (id) => {
  const list = getNotifications().filter(n => n.id !== id);
  saveNotifications(list);
};

// ── Clear all ─────────────────────────────────────────────────────────────────
export const clearAll = () => {
  saveNotifications([]);
};

// ── Unread count ──────────────────────────────────────────────────────────────
export const getUnreadCount = () => getNotifications().filter(n => !n.read).length;

// ── Warehouse-specific helpers ────────────────────────────────────────────────

export const notifyPricingAdded = (productName, poNumber) =>
  pushNotification({
    type:    'PRICING_ADDED',
    title:   `💰 Pricing Set: ${productName || 'Product'}`,
    message: `Auto-calculated from PO ${poNumber || ''}. Click to review in Pricing tab.`,
    source:  'SYSTEM',
  });

export const notifyPricingUpdated = (productName, poNumber, sellingPrice, mrp, discount) =>
  pushNotification({
    type:    'PRICING_UPDATED',
    title:   `🔄 Pricing Updated: ${productName || 'Product'}`,
    message: `PO ${poNumber || ''} → Selling ₹${sellingPrice} | MRP ₹${mrp} | ${discount}% OFF. Click to review.`,
    source:  'SYSTEM',
  });

export const notifyPOCreated = (poNumber, supplierName) =>
  pushNotification({
    type:    'PO_CREATED',
    title:   `📋 New PO Created: ${poNumber}`,
    message: `Purchase Order for ${supplierName || 'supplier'} created. Approval pending.`,
    source:  'WAREHOUSE',
  });

export const notifyPOApproved = (poNumber, supplierName) =>
  pushNotification({
    type:    'PO_APPROVED',
    title:   `✅ PO Approved: ${poNumber}`,
    message: `Purchase Order for ${supplierName || 'supplier'} approved. Ready for receiving.`,
    source:  'WAREHOUSE',
  });

export const notifyGRNCreated = (grnNumber, poNumber) =>
  pushNotification({
    type:    'GRN_CREATED',
    title:   `📦 GRN Created: ${grnNumber}`,
    message: `Goods received against ${poNumber}. Inspection pending.`,
    source:  'WAREHOUSE',
  });

export const notifyGRNCompleted = (grnNumber, totalAccepted) =>
  pushNotification({
    type:    'GRN_COMPLETED',
    title:   `✔️ GRN Completed: ${grnNumber}`,
    message: `${totalAccepted} units putaway completed. Stock updated in inventory.`,
    source:  'WAREHOUSE',
  });

export const notifyOrderProcessing = (orderNumber, itemCount) =>
  pushNotification({
    type:    'ORDER_PROCESSING',
    title:   `🏃 New Pick List: Order #${orderNumber?.slice(0,15)}`,
    message: `Admin marked order as PROCESSING. ${itemCount || ''} item(s) ready to pick from warehouse bins.`,
    source:  'WAREHOUSE',
  });

export const notifyLowStock = (productName, remaining) =>
  pushNotification({
    type:    'LOW_STOCK',
    title:   `⚠️ Low Stock Alert`,
    message: `"${productName}" has only ${remaining} units remaining.`,
    source:  'SYSTEM',
  });

export const notifyAutoPOCreated = (poNumber, productName, currentStock, threshold) =>
  pushNotification({
    type:    'AUTO_PO_CREATED',
    title:   `🤖 Auto PO: ${poNumber}`,
    message: `"${productName}" stock=${currentStock} fell below threshold=${threshold}. DRAFT PO created — please review & approve.`,
    source:  'SYSTEM',
  });

export const notifyTransferRequest = (fromWH, toWH, qty) =>
  pushNotification({
    type:    'TRANSFER_REQUEST',
    title:   `🔄 Transfer Request`,
    message: `${qty} units requested from WH-${fromWH} → WH-${toWH}. Approval needed.`,
    source:  'WAREHOUSE',
  });

// ── Order fulfillment helpers ─────────────────────────────────────────────────

export const notifyOrderPicked = (orderId, pickerName, pickListData = null) =>
  pushNotification({
    type:    'ORDER_PICKED',
    title:   `🛒 Order Picked: #${String(orderId).slice(0, 20)}`,
    message: `Order picked by ${pickerName || 'Picker'}. Ready for packing.`,
    source:  'WAREHOUSE',
    pickListData, // ← embed full pick list so PackerDashboard can show without re-fetch
  });

// Picker pick complete confirmation notification
export const notifyPickComplete = (orderId, pickerName) =>
  pushNotification({
    type:    'PICK_COMPLETE',
    title:   `✅ Pick Complete: #${String(orderId).slice(0, 20)}`,
    message: `Pick list for Order #${String(orderId).slice(0, 20)} completed by ${pickerName || 'Picker'}. Sent to packer.`,
    source:  'WAREHOUSE',
  });

// Notify Packer of upcoming pack job (when manager assigns)
export const notifyPackListUpcoming = (orderId, packerName) =>
  pushNotification({
    type:    'PACK_LIST_UPCOMING',
    title:   `📦 Upcoming Pack Job: #${String(orderId).slice(0, 20)}`,
    message: `Order #${String(orderId).slice(0, 20)} assigned to ${packerName || 'Packer'}. Picker is working on it.`,
    source:  'WAREHOUSE',
  });

export const notifyOrderPacked = (orderId, packerName) =>
  pushNotification({
    type:    'ORDER_PACKED',
    title:   `📦 Order Packed: #${orderId}`,
    message: `Order #${orderId} packed by ${packerName || 'Packer'}. Ready for shipping.`,
    source:  'WAREHOUSE',
  });

// Notify Shipping from Packer (not Picker — different type)
export const notifyPackedSentToShipping = (orderId, packerName, packDetail = null) =>
  pushNotification({
    type:    'ORDER_PACKED_FOR_SHIPPING',
    title:   `📦 Ready to Ship: #${String(orderId).slice(0, 20)}`,
    message: `Order packed by ${packerName || 'Packer'}. Ready for shipping dispatch.`,
    source:  'WAREHOUSE',
    packDetail, // embed pack details so shipping can show box/weight info
  });

export const notifyOrderShipped = (orderId, trackingNumber, carrier) =>
  pushNotification({
    type:    'ORDER_SHIPPED',
    title:   `🚚 Order Shipped: #${orderId}`,
    message: `Order #${orderId} shipped via ${carrier || 'Courier'}. Tracking: ${trackingNumber || 'N/A'}.`,
    source:  'WAREHOUSE',
  });

export const notifyDeliveryAssigned = (orderId, deliveryBoyName, carrier, trackingNumber) =>
  pushNotification({
    type:    'ORDER_ASSIGNED',
    title:   `🛵 New Delivery: #${String(orderId).slice(0, 18)}`,
    message: `Order assigned to you via ${carrier || 'Courier'}. AWB: ${trackingNumber || 'N/A'}. Pick up from warehouse.`,
    source:  'WAREHOUSE',
    orderId,
  });

export const notifyCycleCountDue = (location, scheduledDate) =>
  pushNotification({
    type:    'CYCLE_COUNT_DUE',
    title:   `🔍 Cycle Count Due: ${location}`,
    message: `Cycle count scheduled for ${location} on ${scheduledDate || 'today'}. Please complete.`,
    source:  'SYSTEM',
  });

export const notifyDiscrepancyFound = (location, productName, expected, actual) =>
  pushNotification({
    type:    'DISCREPANCY_FOUND',
    title:   `⚠️ Discrepancy Found: ${location}`,
    message: `${productName}: Expected ${expected}, Found ${actual}. Variance: ${actual - expected}.`,
    source:  'WAREHOUSE',
  });

// ── Receiving Clerk alert — only for Receiving Clerk ─────────────────────────
// Pushed when Warehouse Manager clicks "Notify Receiving" button.
// forRole: 'RECEIVING' — visible only in Receiving Clerk's dashboard.
export const notifyReceivingAlert = (poNumber, supplierName, expectedDate) =>
  pushNotification({
    type:    'RECEIVING_ALERT',
    title:   `📦 Incoming Stock: ${poNumber}`,
    message: `Stock incoming from ${supplierName || 'Supplier'}. Expected: ${expectedDate || 'TBD'}. Please prepare for receiving.`,
    source:  'WAREHOUSE',
    forRole: 'RECEIVING',
  });

// ── Inventory Updated — notify Admin ─────────────────────────────────────────
// Triggered when Receiving Clerk completes putaway and inventory is added.
// Admin only — comes via WebSocket /topic/admin/notifications.
export const notifyInventoryUpdated = (productName, qtyAdded, grnNumber) =>
  pushNotification({
    type:    'INVENTORY_UPDATED',
    title:   `📦 Inventory Updated: ${productName}`,
    message: `+${qtyAdded} units added to stock from GRN ${grnNumber}.`,
    source:  'WAREHOUSE',
    forRole: 'ADMIN',
  });

export const notifyTransferApproved = (transferId, fromWH, toWH) =>
  pushNotification({
    type:    'TRANSFER_APPROVED',
    title:   `✅ Transfer Approved: #${transferId}`,
    message: `Stock transfer from WH-${fromWH} → WH-${toWH} approved. Ready for dispatch.`,
    source:  'WAREHOUSE',
  });

// ── Pick List Assignment — notify Picker (when Manager assigns) ───────────────
// Called from PickListAssignment.js autoAssignAll() + handleEditSave().
// PICK_LIST_ASSIGNED type — present in PickerDashboard's PICKER_NOTIF_TYPES.
export const notifyPickListAssigned = (orderNumber, pickerName, pickListId = null) =>
  pushNotification({
    type:    'PICK_LIST_ASSIGNED',
    title:   `📋 New Pick List Assigned`,
    message: `Order #${String(orderNumber).slice(0, 20)} assigned to ${pickerName || 'you'} by Manager. Check your Pending list.`,
    source:  'WAREHOUSE',
    data:    { pickListId, orderNumber, pickerName },
  });


export const notifyNewOrder = (orderId, itemCount, total, paymentMethod) =>
  pushNotification({
    type:    'NEW_ORDER',
    title:   `🛒 New Order #${String(orderId).slice(-6)}`,
    message: `${itemCount} item(s) · ₹${Number(total).toLocaleString('en-IN')} · ${paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}`,
    source:  'ORDER',
    orderId,
  });

// ── Return Request — notify Admin ─────────────────────────────────────────────
// Called from OrderHistory.js when customer submits a return request.
// Shows in Admin notification bell → "Returns" section.
export const notifyReturnRequested = (orderNumber, productName, returnReason, customerId) =>
  pushNotification({
    type:    'ORDER_RETURN_REQUESTED',
    title:   `🔄 Return Request: #${String(orderNumber).slice(0, 18)}`,
    message: `Customer #${customerId || '—'} requested return for "${productName || 'item'}". Reason: ${returnReason || '—'}. Go to Orders → Returns tab to review.`,
    source:  'ORDER',
    data:    { orderNumber, productName, returnReason, customerId },
  });
