import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cartManager } from '../../data';
import { imsService, fetchWithAuth } from '../../services/imsApi';
import { getNotifications, notifyReturnRequested } from '../../services/notificationStore';
import './OrderHistory.css';

const API = 'http://localhost:9999/api';

const parseDate = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) {
    const [y, m, d, h = 0, min = 0, s = 0] = val;
    return new Date(y, m - 1, d, h, min, s);
  }
  const dt = new Date(val);
  return isNaN(dt.getTime()) ? null : dt;
};

const formatDate = (val) => {
  const dt = parseDate(val);
  if (!dt) return 'N/A';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getHeaders = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

// ✅ authFetch - fetchWithAuth wrapper with Content-Type header
const authFetch = (url, options = {}) => fetchWithAuth(url, {
  ...options,
  headers: { 'Content-Type': 'application/json', ...options.headers }
});

const STATUS_STEPS = ['CONFIRMED', 'PROCESSING', 'PICKED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

// Full visual flow — shown to customer
// PROCESSING = picker assigned, picking in progress
// PICKED     = picker done, waiting for packer
// PACKED     = packer done, ready to ship
const VISUAL_FLOW = [
  { key: 'CONFIRMED',        label: 'Order Confirmed',  icon: '✅', desc: 'Your order is confirmed',                    color: '#0d9488' },
  { key: 'PROCESSING',       label: 'Picking Items',    icon: '🏃', desc: 'Warehouse is picking your items',            color: '#2563eb' },
  { key: 'PICKED',           label: 'Picked',           icon: '🛒', desc: 'Items picked — being prepared for packing',  color: '#7c3aed' },
  { key: 'PACKED',           label: 'Packing',          icon: '📦', desc: 'Your order is packed and ready to ship',     color: '#d97706' },
  { key: 'SHIPPED',          label: 'Shipped',          icon: '🚚', desc: 'Order handed to courier',                    color: '#7c3aed' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🛵', desc: 'Delivery partner is on the way',             color: '#0891b2' },
  { key: 'DELIVERED',        label: 'Delivered',        icon: '🎉', desc: 'Order delivered successfully',               color: '#16a34a' },
];

// Customer-facing step labels — warehouse roles shown clearly
const STEP_LABELS = {
  CONFIRMED:        { label: 'Confirmed',    icon: '✅' },
  PROCESSING:       { label: 'Picking',      icon: '🏃' },
  PICKED:           { label: 'Picked',       icon: '🛒' },
  PACKED:           { label: 'Packed',       icon: '📦' },
  SHIPPED:          { label: 'Shipped',      icon: '🚚' },
  OUT_FOR_DELIVERY: { label: 'On the Way',   icon: '🛵' },
  DELIVERED:        { label: 'Delivered',    icon: '🎉' },
};

const STATUS_META = {
  CONFIRMED:        { label: 'Order Confirmed',   icon: '✅', color: '#0d9488', bg: '#f0fdfa' },
  PROCESSING:       { label: 'Being Processed',   icon: '⚙️', color: '#2563eb', bg: '#eff6ff' },
  PICKED:           { label: 'Items Picked',      icon: '🛒', color: '#7c3aed', bg: '#f5f3ff' },
  PACKED:           { label: 'Packed',            icon: '📦', color: '#d97706', bg: '#fffbeb' },
  SHIPPED:          { label: 'Shipped',           icon: '🚚', color: '#7c3aed', bg: '#f5f3ff' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  icon: '🛵', color: '#0891b2', bg: '#e0f2fe' },
  DELIVERED:        { label: 'Delivered',         icon: '🎉', color: '#16a34a', bg: '#f0fdf4' },
  CANCELLED:        { label: 'Cancelled',         icon: '❌', color: '#dc2626', bg: '#fef2f2' },
  FAILED:           { label: 'Failed',            icon: '⚠️', color: '#b91c1c', bg: '#fef2f2' },
  PENDING:          { label: 'Pending',           icon: '⏳', color: '#d97706', bg: '#fffbeb' },
};

const RETURN_STATUS_META = {
  RETURN_INITIATED:   { label: 'Return Initiated',   color: '#d97706', bg: '#fffbeb', icon: '🔄' },
  RETURN_REQUESTED:   { label: 'Return Requested',   color: '#7c3aed', bg: '#f5f3ff', icon: '📋' },
  RETURN_APPROVED:    { label: 'Return Approved',    color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
  RETURN_REJECTED:    { label: 'Return Rejected',    color: '#dc2626', bg: '#fef2f2', icon: '❌' },
  RETURN_COMPLETED:   { label: 'Return Completed',   color: '#0d9488', bg: '#f0fdfa', icon: '🎉' },
  REFUND_INITIATED:   { label: 'Refund Initiated',   color: '#2563eb', bg: '#eff6ff', icon: '💳' },
  REFUND_COMPLETED:   { label: 'Refund Completed',   color: '#16a34a', bg: '#f0fdf4', icon: '💰' },
};

const RETURN_REASONS = [
  'Product damaged on delivery',
  'Wrong product delivered',
  'Product not as described',
  'Missing parts or accessories',
  'Changed my mind',
  'Better price available elsewhere',
  'Other',
];

// ── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange, readonly = false, size = 24 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          style={{ fontSize: size, cursor: readonly ? 'default' : 'pointer',
            color: star <= (hovered || value) ? '#f59e0b' : '#d1d5db',
            transition: 'color 0.15s', lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

// ── Return Status Badge ──────────────────────────────────────────────────────
function ReturnStatusBadge({ status }) {
  if (!status) return null;
  const meta = RETURN_STATUS_META[status] || { label: status, color: '#6b7280', bg: '#f3f4f6', icon: '🔄', hint: '' };
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 5 }}>
      {/* Badge pill */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
        background: meta.bg, color: meta.color, border: `1.5px solid ${meta.color}44`,
        width: 'fit-content'
      }}>
        {meta.icon} {meta.label}
      </span>
      {/* Hint line below badge */}
      {meta.hint && (
        <span style={{
          fontSize: 11.5, color: '#64748b', lineHeight: 1.5,
          paddingLeft: 4, maxWidth: 320
        }}>
          {meta.hint}
        </span>
      )}
    </div>
  );
}

// ── Modal Overlay Wrapper ────────────────────────────────────────────────────
function ModalOverlay({ onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <style>{`@keyframes oh-spin { to { transform: rotate(360deg); } } @keyframes oh-slide-up { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 28, maxWidth: 520, width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto',
        animation: 'oh-slide-up 0.25s ease'
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({ item, onClose, onSubmitted }) {
  const [rating, setRating]         = useState(item.existingReview?.rating || 0);
  const [comment, setComment]       = useState(item.existingReview?.comment || '');
  const [photoUrl, setPhotoUrl]     = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const isEdit = !!item.existingReview;
  const LABELS = ['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Very Good 😊', 'Excellent 🤩'];

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://localhost:9999/api/images/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const raw = await res.text();
      // Response may be plain URL string or JSON like {"imageUrl":"..."} or {"url":"..."}
      let finalUrl = raw.trim();
      try {
        const parsed = JSON.parse(raw);
        finalUrl = parsed.imageUrl || parsed.url || parsed.secure_url || parsed.link || raw.trim();
      } catch (_) { /* plain string — use as-is */ }
      // If still not an http URL, prefix with base
      if (finalUrl && !finalUrl.startsWith('http')) {
        finalUrl = `http://localhost:9094${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`;
      }
      setPhotoUrl(finalUrl);
    } catch (e) {
      setError('Photo upload failed: ' + e.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a rating'); return; }
    setLoading(true); setError('');
    try {
      const customerId   = localStorage.getItem('customerId') || localStorage.getItem('userId');
      const customerName = localStorage.getItem('userName') || 'Customer';
      let res;
      if (isEdit) {
        res = await authFetch(`${API}/auth/user/products/updateReview/${item.existingReview.id}`,
          { method: 'PUT', body: JSON.stringify({ rating, comment }) });
      } else {
        res = await authFetch(`${API}/auth/user/products/addReview`,
          { method: 'POST',
            body: JSON.stringify({ productId: item.productId, customerId: Number(customerId), rating, comment, photoUrl: photoUrl || null, customerName }) });
      }
      if (res.ok) { onSubmitted(); onClose(); }
      else { const t = await res.text(); setError(t || 'Failed to submit review'); }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>
          {isEdit ? '✏️ Edit Review' : '⭐ Write a Review'}
        </h2>
        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: '#6b7280' }}>✕</button>
      </div>

      {/* Product info card with uploaded photo preview on the right border */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', position: 'relative' }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#e5e7eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.productName || 'Product'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
          ) : '📦'}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: 14 }}>{item.productName || `Product #${item.productId}`}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Barcode: {item.barcode}</p>
        </div>
        {/* Uploaded photo preview pinned to right side of the card */}
        {photoUrl && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={photoUrl}
              alt="Review photo"
              style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '2px solid #6366f1', display: 'block' }}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            {/* Fallback if image fails to load */}
            <div style={{ display: 'none', width: 56, height: 56, borderRadius: 10, border: '2px solid #6366f1', background: '#ede9fe', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🖼️</div>
            <button
              onClick={() => setPhotoUrl('')}
              style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              ✕
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 18 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Your Rating *</p>
        <StarRating value={rating} onChange={setRating} size={36} />
        {rating > 0 && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>{LABELS[rating]}</p>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Your Review</p>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Share your experience..." maxLength={1000} rows={4}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>{comment.length}/1000</p>
      </div>

      {/* Photo upload — only for new reviews */}
      {!isEdit && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Add Photo <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></p>
          {!photoUrl ? (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              border: '1.5px dashed #d1d5db', borderRadius: 10, cursor: photoUploading ? 'not-allowed' : 'pointer',
              background: '#fafafa', color: '#6b7280', fontSize: 13
            }}>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={photoUploading} style={{ display: 'none' }} />
              {photoUploading
                ? <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'oh-spin 0.7s linear infinite' }} /> Uploading to Cloudinary...</>
                : <>📷 Click to upload a photo</>}
            </label>
          ) : (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#10b981', fontWeight: 600 }}>✅ Uploaded to Cloudinary</p>
              <input
                type="text"
                value={photoUrl}
                readOnly
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 11, color: '#6b7280', background: '#f9fafb', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>
      )}

      {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>❌ {error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '11px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>Cancel</button>
        <button onClick={handleSubmit} disabled={loading || rating === 0}
          style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
            cursor: rating === 0 ? 'not-allowed' : 'pointer',
            background: rating === 0 ? '#e5e7eb' : 'linear-gradient(135deg, #111827, #374151)',
            color: rating === 0 ? '#9ca3af' : '#fff' }}>
          {loading ? 'Submitting...' : isEdit ? 'Update Review' : '⭐ Submit Review'}
        </button>
      </div>
    </ModalOverlay>
  );
}

// ── Return Modal — Customer initiates, sees live status ──────────────────────
function ReturnModal({ item, orderNumber, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [returnRef, setReturnRef] = useState('');

  // Step 1 fields (customer fills)
  const [returnReason, setReturnReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [damageDeclared, setDamageDeclared] = useState(false);
  const [damageReason, setDamageReason]   = useState('');

  const handleSubmit = async () => {
    const finalReason = returnReason === 'Other' ? customReason.trim() : returnReason.trim();
    if (!finalReason) { setError('Please select a reason for return'); return; }
    if (damageDeclared && !damageReason.trim()) { setError('Please describe the damage so we can process your return'); return; }
    setLoading(true); setError('');
    try {
      const result = await imsService.orders.initiateReturn({
        orderNumber,
        barcode: item.barcode,
        returnReason: finalReason,
        damageDeclared,
        damageReason: damageDeclared ? damageReason : null,
        images: []
      });
      console.log('Return API result:', result);
      if (result.error) {
        const msg = (result.message || result.error || '').toLowerCase();
        console.log('Return error msg:', msg);
        if (msg.includes('inventory not found') || msg.includes('not found')) {
          setError('We could not find this item in our system. Please contact customer support.');
        } else if (msg.includes('invalid inventory status') || msg.includes('invalid status')) {
          setError('This item is not eligible for return right now. Please contact support if you think this is a mistake.');
        } else if (msg.includes('return window') || msg.includes('15 days') || msg.includes('expired')) {
          setError('Return window has closed. Items can only be returned within 15 days of delivery.');
        } else if (msg.includes('must be delivered') || msg.includes('not delivered')) {
          setError('Return can only be requested after the item has been delivered to you.');
        } else if (msg.includes('already') || msg.includes('duplicate')) {
          setError('A return request for this item already exists. Check your return status below.');
        } else if (msg.includes('category') || msg.includes('not eligible') || msg.includes('not allowed')) {
          setError('This product category is not eligible for returns. Please contact support for help.');
        } else if (msg.includes('network') || msg.includes('timeout') || msg.includes('connection')) {
          setError('Network issue. Please check your internet connection and try again.');
        } else {
          setError('Something went wrong. Please try again or contact customer support.');
        }
      } else {
        // Push admin notification immediately — no backend needed
        notifyReturnRequested(
          orderNumber,
          item.productName || `Product #${item.productId}`,
          finalReason,
          localStorage.getItem('customerId') || localStorage.getItem('userId')
        );
        // Show success screen first — onSuccess (fetchOrders) called only when user closes modal
        setReturnRef(result.returnReference || '');
        setSubmitted(true);
      }
    } catch (e) {
      setError('Could not connect to the server. Please check your internet and try again.');
    }
    finally { setLoading(false); }
  };

  return (
    <ModalOverlay onClose={submitted ? () => { onSuccess(); onClose(); } : onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>🔄 Return Item</h2>
        <button onClick={submitted ? () => { onSuccess(); onClose(); } : onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: '#6b7280' }}>✕</button>
      </div>

      {/* Product info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#e5e7eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.productName || 'Product'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
          ) : '📦'}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: 14 }}>{item.productName || `Product #${item.productId}`}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Barcode: {item.barcode}</p>
        </div>
      </div>

      {submitted ? (
        /* ── Success state ── */
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
          <h3 style={{ margin: '0 0 6px', color: '#16a34a', fontSize: 18, fontWeight: 800 }}>
            Return Request Submitted!
          </h3>
          <p style={{ margin: '0 0 4px', color: '#374151', fontSize: 13.5 }}>
            Your return has been registered successfully.
          </p>
          {returnRef && (
            <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: 11.5 }}>
              Reference: <strong style={{ color: '#475569' }}>{returnRef}</strong>
            </p>
          )}

          {/* Timeline */}
          <div style={{ textAlign: 'left', marginBottom: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, fontWeight: 700, color: '#374151' }}>
              📋 What happens next?
            </p>

            {/* Step 1 — active */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#c9a227', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>1</div>
                <div style={{ width: 2, flex: 1, background: '#e2e8f0', marginTop: 4 }} />
              </div>
              <div style={{ paddingBottom: 14 }}>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>🚚 Pickup Scheduled</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  Our delivery partner will visit your address within <strong>2–3 business days</strong> to pick up the item. Keep it ready in original packaging if possible.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>2</div>
                <div style={{ width: 2, flex: 1, background: '#e2e8f0', marginTop: 4 }} />
              </div>
              <div style={{ paddingBottom: 14 }}>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#475569' }}>🔍 Item Inspection</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  The delivery boy will physically verify the item at pickup. Once approved, your return status will update automatically.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>3</div>
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#475569' }}>💰 Refund to Your Account</p>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                  Once approved, you can request a refund from your Order History. Amount will be credited within <strong>5–7 business days</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', marginBottom: 18, textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#166534', fontWeight: 600 }}>
              💡 You can track your return status in Order History anytime.
            </p>
          </div>

          <button onClick={() => { onSuccess(); onClose(); }} style={{ padding: '11px 32px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
            Got it, Close
          </button>
        </div>
      ) : (
        /* ── Form ── */
        <>
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Return Reason *</p>
            <select value={returnReason} onChange={e => setReturnReason(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none', background: '#fff' }}>
              <option value="">Select a reason</option>
              {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {returnReason === 'Other' && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Please specify *</p>
              <input type="text" value={customReason} onChange={e => setCustomReason(e.target.value)}
                placeholder="Enter your reason..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', border: `2px solid ${damageDeclared ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, background: damageDeclared ? '#fef2f2' : '#fff', transition: 'all 0.15s' }}>
              <input type="checkbox" checked={damageDeclared} onChange={e => setDamageDeclared(e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: damageDeclared ? '#dc2626' : '#374151' }}>⚠️ Product is damaged</span>
            </label>
          </div>

          {damageDeclared && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Describe the damage *</p>
              <textarea value={damageReason} onChange={e => setDamageReason(e.target.value)}
                placeholder="Describe the damage in detail..." rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <p style={{ margin: 0, fontSize: 13, color: '#991b1b', fontWeight: 600, lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #d97706, #f59e0b)', color: loading ? '#9ca3af' : '#fff' }}>
              {loading ? '⏳ Submitting...' : '🔄 Submit Return Request'}
            </button>
          </div>
        </>
      )}
    </ModalOverlay>
  );
}

// ── Refund Modal ─────────────────────────────────────────────────────────────
function RefundModal({ item, orderNumber, onClose, onSuccess }) {
  const [refundReason, setRefundReason] = useState('');
  const [currency, setCurrency]         = useState('INR');
  const [refundMethod, setRefundMethod] = useState('ONLINE');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(null);

  const handleSubmit = async () => {
    if (!refundReason.trim()) { setError('Please enter a refund reason'); return; }
    setLoading(true); setError('');
    try {
      const result = await imsService.orders.doRefund({
        orderNumber,
        barcode: item.barcode,
        refundReason,
        currency,
        refundMethod,
      });
      if (result.error) {
        const msg = (result.message || result.error || '').toLowerCase();
        if (msg.includes('must be return approved') || msg.includes('invalid_refund_status') || msg.includes('return approved')) {
          setError('Refund is only available after your return has been approved. Please wait for admin/delivery boy approval.');
        } else if (msg.includes('already processed') || msg.includes('already refunded') || msg.includes('refund_already')) {
          setError('Refund has already been processed for this item.');
        } else if (msg.includes('return record not found') || msg.includes('return not found')) {
          setError('No return request found for this item. Please initiate a return first.');
        } else if (msg.includes('payment refund failed')) {
          setError('Payment refund failed. Please contact support with your order number.');
        } else {
          setError(result.message || 'Refund could not be processed right now. Please try again or contact support.');
        }
      }
      else {
        setSuccess(result);
        setTimeout(() => { onSuccess(); onClose(); }, 2500);
      }
    } catch (e) { setError('Could not connect to the server. Please check your internet and try again.'); }
    finally { setLoading(false); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>💳 Request Refund</h2>
        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: '#6b7280' }}>✕</button>
      </div>

      {success ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <h3 style={{ margin: '0 0 8px', color: '#16a34a', fontSize: 18, fontWeight: 800 }}>Refund Initiated!</h3>
          <p style={{ margin: '0 0 8px', color: '#374151', fontSize: 14 }}>
            Refund of <strong>₹{Number(success.totalRefundAmount || 0).toFixed(2)}</strong> has been initiated
            via <strong>{(success.refundMethod || refundMethod) === 'CASH' ? '💵 Cash' : '💳 Online'}</strong>.
          </p>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>Ref: {success.refundReference}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: '#e5e7eb', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.productName || 'Product'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
              ) : '📦'}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: 14 }}>{item.productName || `Product #${item.productId}`}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Barcode: {item.barcode}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>₹{Number(item.totalPrice || 0).toFixed(2)}</p>
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: '#fffbeb', borderRadius: 10, marginBottom: 16, border: '1px solid #fde68a' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
              ⚠️ Refund is only available after return has been approved.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Refund Method *</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: 'ONLINE', label: '💳 Online', desc: 'Back to original payment method (5–7 days)' },
                { value: 'CASH',   label: '💵 Cash',   desc: 'Our delivery partner will visit you to hand back cash' },
              ].map(opt => (
                <label
                  key={opt.value}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${refundMethod === opt.value ? '#2563eb' : '#e5e7eb'}`,
                    background: refundMethod === opt.value ? '#eff6ff' : '#fff',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="refundMethod"
                      value={opt.value}
                      checked={refundMethod === opt.value}
                      onChange={() => setRefundMethod(opt.value)}
                      style={{ width: 15, height: 15, accentColor: '#2563eb' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: refundMethod === opt.value ? '#1d4ed8' : '#374151' }}>
                      {opt.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#6b7280', paddingLeft: 23 }}>{opt.desc}</span>
                </label>
              ))}
            </div>

            {/* Cash refund info box */}
            {refundMethod === 'CASH' && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                  🚚 How Cash Refund Works
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
                    <strong>1.</strong> Our delivery partner will visit your delivery address within <strong>2–3 business days</strong>.
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
                    <strong>2.</strong> They will hand you <strong>₹{Number(item.totalPrice || 0).toFixed(2)}</strong> in cash directly.
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
                    <strong>3.</strong> You will receive a confirmation once the cash is handed over.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Refund Reason *</p>
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)}
              placeholder="Why are you requesting a refund?"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Currency</p>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}>
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <p style={{ margin: 0, fontSize: 13, color: '#991b1b', fontWeight: 600, lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff' }}>
              {loading ? 'Processing...' : '💳 Submit Refund Request'}
            </button>
          </div>
        </>
      )}
    </ModalOverlay>
  );
}

// ── Claim Refund Button (for old cancelled orders without refund) ─────────────
function ClaimRefundButton({ order, onRefunded }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [refundAmount, setRefundAmount] = useState(null);
  const [error, setError]     = useState('');

  const handleClaim = async () => {
    setLoading(true); setError('');
    try {
      const result = await imsService.orders.cancelRefund(order.orderNumber, 'Refund claim for cancelled order');
      if (result && result.error) {
        setError('Refund request failed. Please contact support.');
      } else {
        setRefundAmount(result?.refundAmount || order.totalAmount);
        setDone(true);
        setTimeout(() => onRefunded(), 2000);
      }
    } catch (e) {
      setError('Could not process refund. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{
      padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0',
      borderRadius: 10, maxWidth: 280, textAlign: 'left'
    }}>
      <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: '#15803d' }}>
        ✅ Refund Initiated!
      </p>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#166534' }}>
        ₹{Number(refundAmount || 0).toFixed(2)} will be credited to your original payment method.
      </p>
      <p style={{ margin: 0, fontSize: 11, color: '#16a34a' }}>
        📧 Confirmation email sent · ⏱ 5–7 business days
      </p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button
        onClick={handleClaim}
        disabled={loading}
        style={{
          padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff',
          border: 'none', borderRadius: 8, opacity: loading ? 0.7 : 1
        }}>
        {loading ? '⏳ Processing...' : '💰 Claim Refund'}
      </button>
      {error && (
        <span style={{ fontSize: 11, color: '#dc2626', maxWidth: 200, textAlign: 'right' }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ── Cancel Order Modal ────────────────────────────────────────────────────────
function CancelOrderModal({ order, onClose, onSuccess }) {
  const [reason, setReason]       = useState('');
  const [otherText, setOtherText] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [refundInfo, setRefundInfo] = useState(null);

  const CANCEL_REASONS = [
    'Changed my mind',
    'Found a better price',
    'Ordered by mistake',
    'Delivery taking too long',
    'Other',
  ];

  const isCod = (order.paymentMode || '').toUpperCase() === 'CASH_ON_DELIVERY';

  // Final reason to send — if "Other" selected, use the typed text
  const finalReason = reason === 'Other'
    ? (otherText.trim() || 'Other')
    : reason;

  const handleCancel = async () => {
    if (!reason.trim()) { setError('Please select a reason to continue'); return; }
    if (reason === 'Other' && !otherText.trim()) { setError('Please describe your reason'); return; }
    setLoading(true); setError('');
    try {
      // Step 1: Cancel the order
      const result = await imsService.orders.cancelOrder(order.orderNumber);
      if (result.error) {
        setError('Could not cancel the order right now. Please try again or contact support.');
        return;
      }

      // Step 2: Trigger refund — await to show result, but don't block on failure
      let refundResult = null;
      try {
        refundResult = await imsService.orders.cancelRefund(order.orderNumber, finalReason);
      } catch (_) {}
      setRefundInfo(refundResult);

      // Step 3: Show success screen — user must click "Got it" to close
      setCancelled(true);
    } catch (e) { setError('Could not connect to the server. Please check your internet and try again.'); }
    finally { setLoading(false); }
  };

  // ── Success screen after cancel ──────────────────────────────────────────
  if (cancelled) {
    return (
      <ModalOverlay onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#16a34a' }}>Order Cancelled</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
            Your order <strong>#{order.orderNumber?.slice(-8)}</strong> has been cancelled successfully.
          </p>

          {isCod ? (
            <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#15803d' }}>📦 Cash on Delivery Order</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#166534' }}>
                No payment was made, so no refund is needed. Your order has been cancelled.
              </p>
            </div>
          ) : (
            <div style={{ padding: '14px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: 16, textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>💰 Refund Initiated</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#1e40af' }}>
                A refund of <strong>₹{Number(order.totalAmount || 0).toFixed(2)}</strong> has been initiated to your original payment method.
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#3b82f6' }}>
                ⏱ Expected in 5–7 business days. A confirmation email has been sent to you.
              </p>
            </div>
          )}

          <button onClick={onClose}
            style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #16a34a, #22c55e)', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}>
            ✓ Got it
          </button>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#dc2626' }}>❌ Cancel Order</h2>
        <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: '#6b7280' }}>✕</button>
      </div>

      <div style={{ padding: '14px 16px', background: '#fef2f2', borderRadius: 10, marginBottom: 20, border: '1px solid #fecaca' }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>⚠️ Are you sure?</p>
        <p style={{ margin: 0, fontSize: 12, color: '#991b1b' }}>
          This will cancel your entire order of <strong>₹{Number(order.totalAmount || 0).toFixed(2)}</strong>. This action cannot be undone.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Reason for cancellation *</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {CANCEL_REASONS.map(r => (
            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: `2px solid ${reason === r ? '#dc2626' : '#e5e7eb'}`, borderRadius: 10, cursor: 'pointer', background: reason === r ? '#fef2f2' : '#fff', transition: 'all 0.15s' }}>
              <input type="radio" name="cancelReason" value={r} checked={reason === r} onChange={() => setReason(r)} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, fontWeight: reason === r ? 700 : 500, color: reason === r ? '#dc2626' : '#374151' }}>{r}</span>
            </label>
          ))}
        </div>

        {/* Other — text box */}
        {reason === 'Other' && (
          <div style={{ marginTop: 10 }}>
            <textarea
              value={otherText}
              onChange={e => setOtherText(e.target.value)}
              placeholder="Please describe your reason..."
              rows={3}
              maxLength={300}
              style={{
                width: '100%', padding: '10px 12px',
                border: `2px solid ${otherText.trim() ? '#dc2626' : '#e5e7eb'}`,
                borderRadius: 10, fontSize: 13, resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'inherit',
                outline: 'none', transition: 'border-color 0.15s',
                background: '#fef2f2',
              }}
            />
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
              {otherText.length}/300
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <p style={{ margin: 0, fontSize: 13, color: '#991b1b', fontWeight: 600, lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '11px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>Keep Order</button>
        <button onClick={handleCancel} disabled={loading}
          style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff' }}>
          {loading ? 'Cancelling...' : '❌ Yes, Cancel Order'}
        </button>
      </div>
    </ModalOverlay>
  );
}

// ── Status Tracker ───────────────────────────────────────────────────────────
function StatusTracker({ status, awbNumber, courierPartner, createdAt, deliveredAt }) {
  const upper = status?.toUpperCase();
  const currentIdx = VISUAL_FLOW.findIndex(s => s.key === upper);
  // For DELIVERED: all steps are done (effectiveIdx = length marks every step as done)
  const effectiveIdx = upper === 'DELIVERED' ? VISUAL_FLOW.length : currentIdx;

  // Don't show tracker for cancelled/failed/unknown
  if (['CANCELLED', 'FAILED', 'REFUNDED'].includes(upper)) return null;
  if (currentIdx === -1) return null;

  return (
    <div className="oh-tracker-wrap" style={{ padding: '12px 0 4px' }}>
      {/* Step dots row */}
      <div className="oh-tracker">
        {VISUAL_FLOW.map((step, idx) => {
          // A step is "done" (green tick) if it is BEFORE the current step,
          // OR if the current status IS that step and it's DELIVERED (all done).
          // The current active step shows its icon with a pulse — NOT a tick.
          const done   = idx < effectiveIdx;
          const active = idx === currentIdx && upper !== 'DELIVERED';

          return (
            <React.Fragment key={step.key}>
              {/* Step */}
              <div className="oh-tracker-step">
                {/* Circle dot */}
                <div
                  className={`oh-tracker-dot ${done ? 'done' : active ? 'active' : 'pending'}`}
                  style={
                    done   ? { background: step.color, boxShadow: `0 2px 8px ${step.color}44` } :
                    active ? { background: step.color, boxShadow: `0 0 0 4px ${step.color}33` } :
                    {}
                  }
                >
                  {/* ✓ checkmark for completed steps, icon for active/future */}
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span style={{ fontSize: active ? 15 : 13, lineHeight: 1 }}>{step.icon}</span>
                  )}
                  {/* Pulse ring for active step */}
                  {active && (
                    <span style={{
                      position: 'absolute', inset: -5, borderRadius: '50%',
                      border: `2px solid ${step.color}`,
                      animation: 'oh-pulse 1.5s ease-out infinite',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>
                {/* Label */}
                <span className={`oh-tracker-label ${done ? 'done' : active ? 'active' : ''}`}
                  style={done ? { color: step.color } : active ? { color: step.color } : {}}>
                  {step.label}
                </span>
                {active && (
                  <span style={{
                    fontSize: 8, color: step.color, fontWeight: 700,
                    background: `${step.color}18`, padding: '1px 5px',
                    borderRadius: 4, marginTop: 2, whiteSpace: 'nowrap',
                  }}>
                    ● Now
                  </span>
                )}
              </div>
              {/* Connector line */}
              {idx < VISUAL_FLOW.length - 1 && (
                <div className={`oh-tracker-line ${done ? 'done' : ''}`}
                  style={done ? { background: step.color } : {}} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active step description banner */}
      {currentIdx >= 0 && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 8,
          background: `${VISUAL_FLOW[currentIdx]?.color}12`,
          border: `1px solid ${VISUAL_FLOW[currentIdx]?.color}33`,
          fontSize: 12, color: VISUAL_FLOW[currentIdx]?.color, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>{VISUAL_FLOW[currentIdx]?.icon}</span>
          <span>{VISUAL_FLOW[currentIdx]?.desc}</span>
          {/* AWB info when shipped */}
          {(upper === 'SHIPPED' || upper === 'OUT_FOR_DELIVERY') && awbNumber && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
              {courierPartner && `${courierPartner} · `}AWB: {awbNumber}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function OrderHistory() {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [searchTerm, setSearchTerm]   = useState('');
  const [expandedId, setExpandedId]   = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [returnModal, setReturnModal] = useState(null);   // { item, orderNumber }
  const [refundModal, setRefundModal] = useState(null);   // { item, orderNumber }
  const [cancelModal, setCancelModal] = useState(null);   // order object
  const [reviews, setReviews]         = useState({});     // { productId: Review }
  const [returnStatuses, setReturnStatuses] = useState({}); // { `${orderNumber}_${barcode}`: status }
  const [productDetails, setProductDetails] = useState({}); // { productId: { name, imageUrl } }
  // Local set of barcodes that were just submitted — hides Return button immediately
  // without waiting for API re-poll (key = `${orderNumber}_${barcode}`)
  const [justSubmittedReturns, setJustSubmittedReturns] = useState(new Set());
  const [deliveryAddress, setDeliveryAddress] = useState(null); // customer's default shipping address

  const customerId = localStorage.getItem('customerId') || localStorage.getItem('userId');

  // Fetch customer's saved delivery address once
  useEffect(() => {
    if (!customerId) return;
    authFetch(`${API}/shipping/addresses/${customerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const def = data.find(a => a.isDefault) || data[0];
          setDeliveryAddress(def);
        }
      })
      .catch(() => {});
  }, [customerId]);

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!customerId || !token) { setError('Please log in to view your orders'); setLoading(false); return; }
      const res = await authFetch(`${API}/orders/customerOrder/${customerId}`);
      if (res.status === 401 || res.status === 403) { setError('Session expired. Please log in again.'); return; }
      if (res.ok) {
        const data = await res.json();
        setOrders(data.sort((a, b) => (parseDate(b.createdAt) || 0) - (parseDate(a.createdAt) || 0)));
      } else { setError('Could not load orders. Please try again.'); }
    } catch (err) { setError('Network error: ' + err.message); }
    finally { setLoading(false); }
  }, [customerId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // 🔄 Poll every 30s — picks up status changes from warehouse/delivery
  useEffect(() => {
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // 🔔 Listen for warehouse notifications — refresh immediately on status change
  useEffect(() => {
    const handler = () => {
      const notifs = getNotifications();
      const hasUpdate = notifs.some(n =>
        ['ORDER_PACKED', 'ORDER_SHIPPED', 'ORDER_PICKED', 'ORDER_ASSIGNED'].includes(n.type) && !n.read
      );
      if (hasUpdate) fetchOrders();
    };
    window.addEventListener('ims_notification_update', handler);
    return () => window.removeEventListener('ims_notification_update', handler);
  }, [fetchOrders]);

  // 🚚 Delivery boy events — OUT_FOR_DELIVERY / DELIVERED instant refresh for customer
  useEffect(() => {
    const handler = () => fetchOrders();
    window.addEventListener('ims_delivery_update', handler);
    return () => window.removeEventListener('ims_delivery_update', handler);
  }, [fetchOrders]);

  // Fetch reviews for delivered items
  useEffect(() => {
    const deliveredItems = orders
      .filter(o => o.orderStatus?.toUpperCase() === 'DELIVERED')
      .flatMap(o => o.items || [])
      .map(i => i.productId)
      .filter((id, idx, arr) => arr.indexOf(id) === idx);

    if (!deliveredItems.length || !customerId) return;
    deliveredItems.forEach(async (productId) => {
      try {
        const res = await authFetch(`${API}/auth/user/products/customer?productId=${productId}&customerId=${customerId}`);
        if (res.ok) {
          const review = await res.json();
          if (review?.id) setReviews(prev => ({ ...prev, [productId]: review }));
        }
      } catch (_) {}
    });
  }, [orders, customerId]);

  // Fetch return statuses for delivered items
  useEffect(() => {
    const deliveredOrders = orders.filter(o => o.orderStatus?.toUpperCase() === 'DELIVERED');
    if (!deliveredOrders.length) return;

    deliveredOrders.forEach(order => {
      (order.items || []).forEach(async (item) => {
        const key = `${order.orderNumber}_${item.barcode}`;
        try {
          const result = await imsService.orders.getReturnStatus(order.orderNumber, item.barcode);
          if (result?.returnStatus) {
            setReturnStatuses(prev => ({ 
              ...prev, 
              [key]: {
                returnStatus: result.returnStatus,
                orderItemStatus: result.orderItemStatus || null
              }
            }));
          }
        } catch (_) {}
      });
    });
  }, [orders]);

  // Fetch product details (name + image) for all order items
  useEffect(() => {
    if (!orders.length) return;
    const allProductIds = [...new Set(
      orders.flatMap(o => (o.items || []).map(i => i.productId)).filter(Boolean)
    )];

    allProductIds.forEach(async (productId) => {
      // Use functional update to check latest state and avoid stale closure
      setProductDetails(prev => {
        if (prev[productId]) return prev; // already fetched, no change
        // Kick off fetch outside the setter
        imsService.products.getProductById(productId)
          .then(product => {
            if (product) {
              setProductDetails(p => ({
                ...p,
                [productId]: {
                  name: product.name || null,
                  imageUrl: product.productUrl || product.imageUrl || null,
                }
              }));
            }
          })
          .catch(() => {});
        // Mark as "loading" so we don't re-fetch
        return { ...prev, [productId]: { name: null, imageUrl: null, _loading: true } };
      });
    });
  }, [orders]);

  const handleBuyAgain = (item) => {
    const pid = item.productId || item.product_id;
    if (!pid) return;
    cartManager.add(pid);
    window.location.href = '/checkout';
  };

  const canCancelOrder = (order) => {
    const cancellable = ['CONFIRMED', 'PROCESSING'];
    return cancellable.includes(order.orderStatus?.toUpperCase());
  };

  const filtered = orders.filter(o =>
    o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.orderStatus?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="oh-loading"><div className="oh-spinner" /><p>Loading your orders...</p></div>
  );

  if (error) return (
    <div className="oh-error">
      <span>⚠️ {error}</span>
      <button onClick={fetchOrders} className="oh-retry-btn">Retry</button>
    </div>
  );

  return (
    <div className="oh-container">
      {/* Modals */}
      {reviewModal && (
        <ReviewModal item={reviewModal} onClose={() => setReviewModal(null)}
          onSubmitted={() => {
            fetchOrders();
            if (customerId) {
              authFetch(`${API}/auth/user/products/customer?productId=${reviewModal.productId}&customerId=${customerId}`)
                .then(r => r.ok ? r.json() : null)
                .then(rv => { if (rv?.id) setReviews(prev => ({ ...prev, [reviewModal.productId]: rv })); })
                .catch(() => {});
            }
          }} />
      )}
      {returnModal && (
        <ReturnModal item={returnModal.item} orderNumber={returnModal.orderNumber}
          onClose={() => setReturnModal(null)}
          onSuccess={() => {
            // Mark this item as submitted immediately (hides button before API re-poll)
            const key = `${returnModal.orderNumber}_${returnModal.item.barcode}`;
            setJustSubmittedReturns(prev => new Set([...prev, key]));
            fetchOrders();
            setReturnStatuses({});
          }} />
      )}
      {refundModal && (
        <RefundModal item={refundModal.item} orderNumber={refundModal.orderNumber}
          onClose={() => setRefundModal(null)}
          onSuccess={() => { fetchOrders(); }} />
      )}
      {cancelModal && (
        <CancelOrderModal order={cancelModal}
          onClose={() => { setCancelModal(null); fetchOrders(); }}
          onSuccess={() => { /* orders refresh on close */ }} />
      )}

      <div className="oh-header">
        <h1 className="oh-title">Your Orders</h1>
        <div className="oh-search-wrap">
          <span className="oh-search-icon">🔍</span>
          <input className="oh-search" placeholder="Search by order number or status"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="oh-empty">
          <div className="oh-empty-icon">📦</div>
          <h3>No orders yet</h3>
          <p>Start shopping to see your orders here.</p>
          <button className="oh-shop-btn" onClick={() => window.location.href = '/shop'}>Start Shopping</button>
        </div>
      ) : (
        <div className="oh-list">
          {filtered.map(order => {
            const meta       = STATUS_META[order.orderStatus?.toUpperCase()] || STATUS_META['CONFIRMED'];
            const isExpanded = expandedId === order.orderNumber;
            const isDelivered = order.orderStatus?.toUpperCase() === 'DELIVERED';
            const isCancellable = canCancelOrder(order);
            const isCancelledOnline = order.orderStatus?.toUpperCase() === 'CANCELLED'
              && (order.paymentMode || '').toUpperCase() !== 'CASH_ON_DELIVERY'
              && (order.paymentStatus || '').toUpperCase() !== 'REFUNDED';

            return (
              <div key={order.orderNumber} className="oh-card">
                {/* Card header */}
                <div className="oh-card-header">
                  <div className="oh-card-meta">
                    <div className="oh-meta-item">
                      <span className="oh-meta-label">Order Placed</span>
                      <span className="oh-meta-value">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="oh-meta-item">
                      <span className="oh-meta-label">Total</span>
                      <span className="oh-meta-value">₹{Number(order.totalAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="oh-meta-item">
                      <span className="oh-meta-label">Payment</span>
                      <span className="oh-meta-value">{order.paymentMode || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="oh-order-id-wrap">
                    <span className="oh-order-id">Order # {order.orderNumber?.slice(0, 18)}...</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {isCancellable && (
                        <button className="oh-cancel-btn" onClick={() => setCancelModal(order)}>
                          ❌ Cancel Order
                        </button>
                      )}
                      {isCancelledOnline && (
                        <ClaimRefundButton order={order} onRefunded={fetchOrders} />
                      )}
                      <button className="oh-toggle-btn"
                        onClick={() => setExpandedId(isExpanded ? null : order.orderNumber)}>
                        {isExpanded ? '▲ Hide details' : '▼ View details'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product preview strip — shown when collapsed */}
                {!isExpanded && order.items?.length > 0 && (
                  <div className="oh-product-strip">
                    {order.items.slice(0, 4).map((item, idx) => {
                      const pd = productDetails[item.productId];
                      const rawN = pd?.name || '';
                      const isJunkN = /^[★\s]*best\s*product[★\s]*$/i.test(rawN.trim());
                      const stripName = rawN && !isJunkN
                        ? rawN
                        : (item.productName || item.name || null);
                      return (
                        <div key={idx} className="oh-product-strip-item">
                          <div className="oh-product-strip-img-wrap">
                            {pd?.imageUrl ? (
                              <img src={pd.imageUrl} alt={stripName || `Product #${item.productId}`} className="oh-product-strip-img"
                                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                            ) : null}
                            <div className="oh-product-strip-placeholder" style={{ display: pd?.imageUrl ? 'none' : 'flex' }}>📦</div>
                          </div>
                          <span className="oh-product-strip-name">{stripName || `Product #${item.productId}`}</span>
                        </div>
                      );
                    })}
                    {order.items.length > 4 && (
                      <div className="oh-product-strip-more">+{order.items.length - 4} more</div>
                    )}
                  </div>
                )}

                {/* Status banner */}
                <div className="oh-status-banner" style={{ background: meta.bg, borderColor: meta.color + '33' }}>
                  <span className="oh-status-icon">{meta.icon}</span>
                  <div>
                    <span className="oh-status-text" style={{ color: meta.color }}>{meta.label}</span>
                    {order.deliveredAt && isDelivered && (
                      <span className="oh-delivered-date"> on {formatDate(order.deliveredAt)}</span>
                    )}
                  </div>
                </div>

                {/* Delivery partner info — shown when order is shipped or beyond */}
                {['SHIPPED','OUT_FOR_DELIVERY','DELIVERED'].includes(order.orderStatus?.toUpperCase()) && order.deliveryBoyName && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f0fdf4', borderRadius:10, border:'1px solid #bbf7d0', margin:'0 0 8px' }}>
                    <span style={{ fontSize:18 }}>🚚</span>
                    <div>
                      <p style={{ margin:0, fontSize:11, color:'#16a34a', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.4px' }}>Delivery Partner</p>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#166534' }}>{order.deliveryBoyName}</p>
                    </div>
                    {order.orderStatus?.toUpperCase() === 'OUT_FOR_DELIVERY' && (
                      <span style={{ marginLeft:'auto', padding:'4px 10px', background:'#dcfce7', color:'#16a34a', borderRadius:20, fontSize:11, fontWeight:700, border:'1px solid #86efac' }}>
                        🛵 On the way
                      </span>
                    )}
                    {order.orderStatus?.toUpperCase() === 'DELIVERED' && (
                      <span style={{ marginLeft:'auto', padding:'4px 10px', background:'#dcfce7', color:'#16a34a', borderRadius:20, fontSize:11, fontWeight:700, border:'1px solid #86efac' }}>
                        ✅ Delivered
                      </span>
                    )}
                  </div>
                )}

                {/* Tracker */}
                <div className="oh-tracker-wrap">
                  <StatusTracker
                    status={order.orderStatus}
                    awbNumber={order.awbNumber}
                    courierPartner={order.courierPartner}
                    createdAt={order.createdAt}
                    deliveredAt={order.deliveredAt}
                  />
                </div>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="oh-items">
                    {order.items?.length > 0 ? order.items.map((item, idx) => {
                      const existingReview = reviews[item.productId];
                      const returnKey      = `${order.orderNumber}_${item.barcode}`;
                      const returnData     = returnStatuses[returnKey];
                      const returnStatus   = (returnData?.returnStatus || returnData || '').toString().toUpperCase();
                      const orderItemStatus = (returnData?.orderItemStatus || '').toString().toUpperCase();

                      // Also check item.orderStatus directly from order data as fallback
                      // Backend sets orderItem.orderStatus = RETURN_APPROVED when return is approved
                      const itemOrderStatus = (item.orderStatus || '').toString().toUpperCase();
                      const effectiveReturnStatus = returnStatus || itemOrderStatus;

                      // justSubmitted = user just submitted return in this session (instant hide, no API wait)
                      const justSubmitted  = justSubmittedReturns.has(returnKey);
                      const hasReturn      = justSubmitted || (!!effectiveReturnStatus && ['RETURN_INITIATED','RETURN_REQUESTED','RETURN_APPROVED','RETURN_REJECTED','RETURN_COMPLETED','REFUND_INITIATED','REFUND_COMPLETED'].includes(effectiveReturnStatus));
                      const isReturnApproved = effectiveReturnStatus === 'RETURN_APPROVED';
                      // Check if refund is completed: either orderItemStatus is REFUNDED, or returnStatus indicates refund completion
                      const isRefunded     = orderItemStatus === 'REFUNDED' || itemOrderStatus === 'REFUNDED' || effectiveReturnStatus === 'REFUND_COMPLETED' || effectiveReturnStatus === 'REFUND_INITIATED';
                      // Return pickup delivery boy info (from returnData enriched by backend)
                      const returnPickupBoyName = returnData?.deliveryBoyName || null;

                      const pd = productDetails[item.productId];
                      // Sanitize name — skip junk/test values that contain only stars or "best product"
                      const rawName = pd?.name || '';
                      const isJunkName = /^[★\s]*best\s*product[★\s]*$/i.test(rawName.trim());
                      const displayName = rawName && !isJunkName
                        ? rawName
                        : (item.productName || item.name || null);

                      return (
                        <div key={idx} className="oh-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                          {/* Item row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="oh-item-img-wrap">
                              {pd?.imageUrl ? (
                                <img
                                  src={pd.imageUrl}
                                  alt={displayName || `Product #${item.productId}`}
                                  className="oh-item-img"
                                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                              ) : null}
                              <div className="oh-item-img-placeholder"
                                style={{ display: pd?.imageUrl ? 'none' : 'flex' }}>
                                📦
                              </div>
                            </div>
                            <div className="oh-item-details" style={{ flex: 1 }}>
                              <p className="oh-item-name">
                                {displayName || `Product #${item.productId}`}
                              </p>
                              <p className="oh-item-qty">Qty: {item.quantity}</p>
                              {hasReturn && (
                                <div style={{ marginTop: 6 }}>
                                  {/* Just submitted this session — show confirmation message before API poll fills in */}
                                  {justSubmitted && !effectiveReturnStatus.includes('RETURN_') ? (
                                    <div style={{ display:'inline-flex', flexDirection:'column', gap:6 }}>
                                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, fontSize:11.5, fontWeight:700, background:'#fffbeb', color:'#d97706', border:'1.5px solid #d97706aa', width:'fit-content' }}>
                                        🔄 Return Initiated
                                      </span>
                                      <span style={{ fontSize:12, color:'#92400e', fontWeight:600, padding:'6px 10px', background:'#fffbeb', borderRadius:8, border:'1px solid #fde68a', lineHeight:1.5 }}>
                                        ✅ Your return request has been submitted. We will contact you within 2–3 business days to arrange pickup.
                                      </span>
                                    </div>
                                  ) : (
                                    <ReturnStatusBadge status={effectiveReturnStatus} />
                                  )}
                                  {/* Show pickup delivery boy when return is initiated */}
                                  {(effectiveReturnStatus === 'RETURN_INITIATED' || justSubmitted) && returnPickupBoyName && returnPickupBoyName !== 'Unassigned' && (
                                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, padding:'5px 10px', background:'#f0fdf4', borderRadius:8, border:'1px solid #bbf7d0', width:'fit-content' }}>
                                      <span style={{ fontSize:13 }}>🚚</span>
                                      <span style={{ fontSize:12, color:'#166534', fontWeight:600 }}>Pickup by: {returnPickupBoyName}</span>
                                    </div>
                                  )}
                                  {(effectiveReturnStatus === 'RETURN_INITIATED' || justSubmitted) && (!returnPickupBoyName || returnPickupBoyName === 'Unassigned') && !justSubmitted && (
                                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, padding:'5px 10px', background:'#fffbeb', borderRadius:8, border:'1px solid #fde68a', width:'fit-content' }}>
                                      <span style={{ fontSize:13 }}>⏳</span>
                                      <span style={{ fontSize:12, color:'#92400e', fontWeight:600 }}>Pickup partner being assigned…</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="oh-item-price">
                              <span className="oh-item-total">₹{Number(item.totalPrice || 0).toFixed(2)}</span>
                              <span className="oh-item-unit">₹{Number(item.unitPrice || 0).toFixed(2)} each</span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          {isDelivered && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {/* Buy Again */}
                              <button onClick={() => handleBuyAgain(item)} className="oh-action-btn oh-action-dark">
                                🛒 Buy it Again
                              </button>

                              {/* Return button — only if no return started */}
                              {!hasReturn && (
                                <button
                                  onClick={() => setReturnModal({ item: { ...item, productName: productDetails[item.productId]?.name, imageUrl: productDetails[item.productId]?.imageUrl }, orderNumber: order.orderNumber })}
                                  className="oh-action-btn oh-action-orange">
                                  🔄 Return Item
                                </button>
                              )}

                              {/* Refund button — only if return is approved and not yet refunded */}
                              {isReturnApproved && !isRefunded && (
                                <button
                                  onClick={() => setRefundModal({ item: { ...item, productName: productDetails[item.productId]?.name, imageUrl: productDetails[item.productId]?.imageUrl }, orderNumber: order.orderNumber })}
                                  className="oh-action-btn oh-action-blue">
                                  💳 Request Refund
                                </button>
                              )}

                              {/* Review button */}
                              {existingReview ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <StarRating value={existingReview.rating} readonly size={16} />
                                  <button onClick={() => setReviewModal({ ...item, productName: productDetails[item.productId]?.name, imageUrl: productDetails[item.productId]?.imageUrl, existingReview })}
                                    className="oh-action-btn oh-action-yellow">
                                    ✏️ Edit Review
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => setReviewModal({ ...item, productName: productDetails[item.productId]?.name, imageUrl: productDetails[item.productId]?.imageUrl, existingReview: null })}
                                  className="oh-action-btn oh-action-star">
                                  ⭐ Write a Review
                                </button>
                              )}
                            </div>
                          )}

                          {/* Existing review display */}
                          {isDelivered && existingReview && (() => {
                            let reviewImgUrl = existingReview.photoUrl || '';
                            try { const p = JSON.parse(reviewImgUrl); reviewImgUrl = p.imageUrl || p.url || ''; } catch {}
                            const hasPhoto = reviewImgUrl && reviewImgUrl.startsWith('http');
                            return (
                              <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                {hasPhoto && (
                                  <img src={reviewImgUrl} alt="review" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #fde68a' }} onError={e => { e.target.style.display = 'none'; }} />
                                )}
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <StarRating value={existingReview.rating} readonly size={14} />
                                  </div>
                                  {existingReview.comment && (
                                    <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{existingReview.comment}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    }) : (
                      <p className="oh-no-items">No item details available</p>
                    )}

                    {/* Delivery Address */}
                    {deliveryAddress && (
                      <div className="oh-delivery-address">
                        <div className="oh-delivery-address-header">
                          <span className="oh-delivery-address-icon">📍</span>
                          <span className="oh-delivery-address-title">Delivery Address</span>
                        </div>
                        <div className="oh-delivery-address-body">
                          {(deliveryAddress.firstName || deliveryAddress.lastName) && (
                            <p className="oh-delivery-name">
                              {[deliveryAddress.firstName, deliveryAddress.lastName].filter(Boolean).join(' ')}
                              {deliveryAddress.contactPhone && (
                                <span className="oh-delivery-phone"> · {deliveryAddress.contactPhone}</span>
                              )}
                            </p>
                          )}
                          <p className="oh-delivery-line">
                            {[
                              deliveryAddress.addressLine1,
                              deliveryAddress.addressLine2,
                              deliveryAddress.city,
                              deliveryAddress.state,
                              deliveryAddress.zipCode,
                              deliveryAddress.country
                            ].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
