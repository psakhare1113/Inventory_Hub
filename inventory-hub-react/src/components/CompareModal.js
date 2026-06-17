import React, { useEffect, useState } from 'react';
import { formatPrice } from '../data';

const API = 'http://localhost:9999/api';

// ── Star display ─────────────────────────────────────────────────────────────
function Stars({ value, size = 13 }) {
  const rounded = Math.round(value || 0);
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= rounded ? '#f59e0b' : '#d1d5db', lineHeight: 1 }}>★</span>
      ))}
    </span>
  );
}

// ── Reviews cell for one product ─────────────────────────────────────────────
function ReviewsCell({ productId }) {
  const [reviews, setReviews] = useState(null); // null = loading

  useEffect(() => {
    if (!productId) return;
    fetch(`${API}/products/${productId}/reviews`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]));
  }, [productId]);

  if (reviews === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: 12 }}>
        <span style={{ width: 14, height: 14, border: '2px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', display: 'inline-block', animation: 'cm-spin 0.7s linear infinite' }} />
        Loading…
      </div>
    );
  }

  if (reviews.length === 0) {
    return <span style={{ fontSize: 12, color: '#9ca3af' }}>No reviews yet</span>;
  }

  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  const total = reviews.length;

  // Rating distribution
  const dist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: (reviews.filter(r => r.rating === star).length / total) * 100,
  }));

  // Latest 2 reviews with comments
  const snippets = reviews.filter(r => r.comment?.trim()).slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Average + stars + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{avg.toFixed(1)}</span>
        <div>
          <Stars value={avg} size={14} />
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{total} review{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Rating bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {dist.map(({ star, count, pct }) => (
          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, color: '#6b7280', width: 8, textAlign: 'right' }}>{star}</span>
            <span style={{ fontSize: 10, color: '#f59e0b' }}>★</span>
            <div style={{ flex: 1, height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 10, color: '#9ca3af', width: 14, textAlign: 'right' }}>{count}</span>
          </div>
        ))}
      </div>

      {/* Latest review snippets */}
      {snippets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
          {snippets.map((r, i) => (
            <div key={i} style={{ background: '#fafafa', borderRadius: 8, padding: '7px 9px', border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                  {(r.customerName || 'U')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{r.customerName || 'Customer'}</span>
                <Stars value={r.rating} size={10} />
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#6b7280', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                "{r.comment}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Feature rows ─────────────────────────────────────────────────────────────
const getFeatureRows = (products) => {
  const allKeys = new Set();
  products.forEach(p => {
    if (Array.isArray(p.features)) {
      p.features.forEach(f => {
        if (f && typeof f === 'object' && f.attributeName) allKeys.add(f.attributeName);
      });
    }
  });

  const baseRows = [
    { key: '__price__',       label: 'Price' },
    { key: '__rating__',      label: 'Avg Rating' },
    { key: '__description__', label: 'Description' },
    { key: '__reviews__',     label: 'Customer Reviews' },
  ];

  const attrRows = Array.from(allKeys).map(k => ({ key: k, label: k }));
  return [...baseRows, ...attrRows];
};

const getCellValue = (product, key) => {
  if (key === '__price__')       return formatPrice(product.price);
  if (key === '__rating__')      return product.rating ? `${product.rating} / 5` : 'N/A';
  if (key === '__description__') return product.description || 'N/A';
  if (key === '__reviews__')     return null; // handled separately

  if (Array.isArray(product.features)) {
    const attr = product.features.find(f => f && typeof f === 'object' && f.attributeName === key);
    return attr ? attr.attributeValue : '—';
  }
  return '—';
};

// ── Main Modal ────────────────────────────────────────────────────────────────
export const CompareModal = ({ compareProducts, onClose, onRemove, onClear, onAddToCart }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const rows = getFeatureRows(compareProducts);
  const colCount = compareProducts.length;

  return (
    <>
      <style>{`@keyframes cm-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
          style={{ maxWidth: '960px', maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-2xl font-serif font-semibold">Compare Products</h2>
              <p className="text-sm text-gray-400 mt-0.5">Side-by-side feature &amp; review comparison</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { onClear(); onClose(); }} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                Clear All
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl leading-none transition-colors">
                ×
              </button>
            </div>
          </div>

          {/* Scrollable table */}
          <div className="overflow-auto flex-1 px-2 pb-4">
            <table className="w-full text-left border-collapse" style={{ minWidth: `${colCount * 240 + 160}px` }}>
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="w-40 p-4 text-sm font-semibold text-gray-400 border-b border-gray-100">Feature</th>
                  {compareProducts.map(p => (
                    <th key={p.id} className="p-4 border-b border-gray-100 align-bottom">
                      <div className="relative group rounded-xl bg-gray-50 p-3 flex flex-col gap-2">
                        <button
                          onClick={() => onRemove(p.id)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow hover:bg-red-500 hover:text-white text-gray-400 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all"
                        >×</button>
                        <img src={p.imageUrl} alt={p.name} className="w-full h-28 object-cover rounded-lg" />
                        <p className="font-medium text-sm leading-tight line-clamp-2">{p.name}</p>
                        <p className="text-primary font-bold text-sm">{formatPrice(p.price)}</p>
                        <button
                          onClick={() => onAddToCart(p.id)}
                          className="w-full py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                        >Add to Cart</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                    <td className="p-4 text-sm font-semibold text-gray-500 whitespace-nowrap align-top">{row.label}</td>
                    {compareProducts.map(p => (
                      <td key={p.id} className="p-4 text-sm text-gray-700 align-top">
                        {row.key === '__reviews__'
                          ? <ReviewsCell productId={p.id} />
                          : getCellValue(p, row.key)
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};
