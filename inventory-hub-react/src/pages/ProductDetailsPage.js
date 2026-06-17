import React, { useState, useEffect } from 'react';
import { formatPrice } from '../data';
import { icons } from '../utils/icons';
import { imsService } from '../services/imsApi';
import ProductRecommendations from '../components/ProductRecommendations';
import RecommendationSection from '../components/RecommendationSection';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { useVisitTracker } from '../hooks/useVisitTracker';
import tracker from '../services/analyticsTracker';
import './ProductDetailsPage.css';

const API_BASE_URL = 'http://localhost:9999/api';

// ── Star Rating (reusable) ───────────────────────────────────────────────────
function StarRating({ value, size = 16, readonly = true }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= value ? '#f59e0b' : '#d1d5db', lineHeight: 1 }}>★</span>
      ))}
    </span>
  );
}

// ── Reviews Section ──────────────────────────────────────────────────────────
// ── Review Image Lightbox ────────────────────────────────────────────────────
function ReviewLightbox({ photos, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);

  // keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % photos.length);
      if (e.key === 'ArrowLeft')  setCurrent(c => (c - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photos.length, onClose]);

  const photo = photos[current];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 18, right: 22, background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer', lineHeight: 1, zIndex: 2 }}
      >×</button>

      {/* Counter */}
      <p style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', color: '#ccc', fontSize: 13, margin: 0 }}>
        {current + 1} / {photos.length}
      </p>

      {/* Prev arrow */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); setCurrent(c => (c - 1 + photos.length) % photos.length); }}
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
        >‹</button>
      )}

      {/* Image */}
      <img
        src={photo.imgUrl}
        alt="review"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '80vw', maxHeight: '65vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
      />

      {/* Next arrow */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); setCurrent(c => (c + 1) % photos.length); }}
          style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
        >›</button>
      )}

      {/* Bottom — customer name + comment */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ marginTop: 20, textAlign: 'center', maxWidth: 520, padding: '0 16px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
            {(photo.customerName || 'U')[0].toUpperCase()}
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{photo.customerName || 'Customer'}</span>
          <span style={{ display: 'inline-flex', gap: 1 }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} style={{ fontSize: 13, color: s <= photo.rating ? '#f59e0b' : '#555' }}>★</span>
            ))}
          </span>
        </div>
        {photo.comment && (
          <p style={{ color: '#d1d5db', fontSize: 13, margin: 0, lineHeight: 1.6 }}>"{photo.comment}"</p>
        )}
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '80vw' }}>
          {photos.map((p, i) => (
            <img
              key={i}
              src={p.imgUrl}
              alt=""
              onClick={e => { e.stopPropagation(); setCurrent(i); }}
              style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: i === current ? '2px solid #f59e0b' : '2px solid transparent', opacity: i === current ? 1 : 0.55, transition: 'all 0.15s' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { photos: [...], startIndex }

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const [revRes, sumRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products/${productId}/reviews`),
        fetch(`${API_BASE_URL}/products/summary?productIds=${productId}`),
      ]);
      if (revRes.ok) setReviews(await revRes.json());
      if (sumRes.ok) {
        const data = await sumRes.json();
        // productId may be number but JSON keys are strings — check both
        setSummary(data[productId] || data[String(productId)] || null);
      }
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (productId) fetchReviews(); }, [productId]);

  const avg   = summary?.averageRating || 0;
  const total = summary?.totalReviews  || 0;

  const formatDate = (val) => {
    if (!val) return '';
    const dt = Array.isArray(val)
      ? new Date(val[0], val[1] - 1, val[2])
      : new Date(val);
    return isNaN(dt) ? '' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Build flat photo list from all reviews (for lightbox navigation across all reviews)
  const resolveImgUrl = (raw) => {
    let url = raw || '';
    try { const p = JSON.parse(url); url = p.imageUrl || p.url || ''; } catch {}
    return url && url.startsWith('http') ? url : '';
  };

  const allPhotos = reviews
    .map(r => ({ imgUrl: resolveImgUrl(r.photoUrl), customerName: r.customerName, rating: r.rating, comment: r.comment }))
    .filter(p => p.imgUrl);

  return (
    <div className="pr-section">
      {lightbox && (
        <ReviewLightbox
          photos={lightbox.photos}
          startIndex={lightbox.startIndex}
          onClose={() => setLightbox(null)}
        />
      )}

      <h3 className="pr-heading">Customer Reviews</h3>

      {/* ── Summary ── */}
      {total > 0 && (
        <div className="pr-summary">
          <div className="pr-avg-block">
            <p className="pr-avg-number">{avg.toFixed(1)}</p>
            <StarRating value={Math.round(avg)} size={18} />
            <p className="pr-avg-count">{total} review{total !== 1 ? 's' : ''}</p>
          </div>

          {/* Rating bars */}
          <div className="pr-bars">
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviews.filter(r => r.rating === star).length;
              const pct   = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={star} className="pr-bar-row">
                  <span className="pr-bar-star-num">{star}</span>
                  <span className="pr-bar-star-icon">★</span>
                  <div className="pr-bar-track">
                    <div className="pr-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="pr-bar-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Photo strip (all review images) ── */}
      {allPhotos.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#374151' }}>
            📷 Customer Photos ({allPhotos.length})
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {allPhotos.map((p, i) => (
              <div
                key={i}
                onClick={() => setLightbox({ photos: allPhotos, startIndex: i })}
                style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #e2e8f0', flexShrink: 0, position: 'relative' }}
              >
                <img
                  src={p.imgUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  onError={e => { e.target.parentElement.style.display = 'none'; }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Reviews list ── */}
      {loading ? (
        <p className="pr-loading">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <div className="pr-empty">
          <span className="pr-empty-icon">⭐</span>
          <p className="pr-empty-title">No reviews yet</p>
          <p className="pr-empty-sub">Be the first to review this product after purchasing</p>
        </div>
      ) : (
        <div className="pr-list">
          {reviews.map((review, reviewIdx) => {
            const imgUrl = resolveImgUrl(review.photoUrl);
            const showPhoto = !!imgUrl;
            // Find this review's index in allPhotos for lightbox
            const photoIdx = allPhotos.findIndex(p => p.imgUrl === imgUrl && p.customerName === review.customerName);

            return (
              <div key={review.id} className="pr-card">
                {/* Top row — avatar + name + date */}
                <div className="pr-card-top">
                  <div className="pr-card-left">
                    <div className="pr-user-row">
                      <div className="pr-avatar">
                        {(review.customerName || 'U')[0].toUpperCase()}
                      </div>
                      <span className="pr-username">
                        {review.customerName || `Customer #${review.customerId}`}
                      </span>
                      <span className="pr-verified">✓ Verified Purchase</span>
                    </div>
                    <StarRating value={review.rating} size={15} />
                  </div>
                  <span className="pr-date">{formatDate(review.createdAt)}</span>
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="pr-comment">{review.comment}</p>
                )}

                {/* Photo thumbnail — click opens lightbox */}
                {showPhoto && (
                  <img
                    src={imgUrl}
                    alt="review"
                    className="pr-photo"
                    onClick={() => setLightbox({ photos: allPhotos, startIndex: photoIdx >= 0 ? photoIdx : 0 })}
                    style={{ cursor: 'zoom-in' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const ProductDetailsPage = ({ product, wishlist, onAddToCart, onToggleWishlist, onBuyNow, onNavigateToProduct }) => {
  const [quantity, setQuantity] = useState(1);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockInfo, setStockInfo] = useState(null); // { available, stockCount }
  const [stockLoading, setStockLoading] = useState(false);
  const guard = useAuthGuard();
  const { trackVisit, getCurrentUserId } = useVisitTracker();
  
  // Track visit when product loads
  useEffect(() => {
    if (product) {
      trackVisit(product);
      // Track for admin analytics dashboard
      tracker.trackProductView({
        id: product.productId || product.id,
        name: product.name,
        category: product.categoryName || product.category,
        price: product.price || product.sellingPrice,
      });
    }
  }, [product?.productId, product?.id]);
  
  useEffect(() => {
    console.log('ProductDetailsPage useEffect triggered');
    console.log('Product object:', product);
    console.log('Product ID from product.productId:', product?.productId);
    console.log('Product ID from product.id:', product?.id);
    
    const productId = product?.productId || product?.id;
    if (productId) {
      console.log('Fetching attributes for product ID:', productId);
      fetchAttributes();
      fetchStockInfo(productId);
    } else {
      console.log('No product ID found, cannot fetch attributes');
    }
  }, [product?.productId, product?.id]);

  const fetchStockInfo = async (productId) => {
    if (!productId) return;
    setStockLoading(true);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:9999/api/inventory/stock/availability?productId=${productId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        }
      );
      if (res.ok) {
        const data = await res.json(); // { productId, available, stockCount, stockLevel }
        setStockInfo({ available: data.available === true, stockCount: Number(data.stockCount ?? 0) });
      }
      // If API fails, don't block — leave stockInfo null (treat as available)
    } catch (_) {
      // Network error — don't block
    } finally {
      setStockLoading(false);
    }
  };
  
  const fetchAttributes = async () => {
    const productId = product?.productId || product?.id;
    console.log('fetchAttributes called');
    console.log('Product object:', product);
    console.log('Using product ID:', productId);
    
    if (!productId) {
      console.log('No product ID found, cannot fetch attributes');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Making API call to fetch attributes for product ID: ${productId}`);
      console.log(`API URL: ${API_BASE_URL}/product-attributes/product/${productId}`);
      
      // Use the correct imsService API
      const data = await imsService.products.getProductAttributes(productId);
      console.log('API Response:', data);
      setAttributes(data || []);
      
      console.log(`Loaded ${data?.length || 0} attributes for product ${productId}:`, data);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      setError('Failed to load product attributes');
      setAttributes([]);
    } finally {
      setLoading(false);
    }
  };
  
  if (!product) return <div className="container py-12"><p>Product not found</p></div>;
  
  const isWishlisted = wishlist.includes(product.productId || product.id);
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  // stockInfo null means API call was not made — should not block
  const isOutOfStock = stockInfo !== null && stockInfo.available === false;
  
  const handleAddToCart = () => {
    // Add to cart is allowed for guests — no auth required
    for (let i = 0; i < quantity; i++) {
      onAddToCart(product.productId || product.id);
    }
    setQuantity(1);
  };

  const handleBuyNow = () => {
    // Block Buy Now if out of stock
    if (isOutOfStock) return;
    guard(
      () => {
        for (let i = 0; i < quantity; i++) {
          onAddToCart(product.productId || product.id);
        }
        setQuantity(1);
        if (onBuyNow) onBuyNow();
      },
      { message: 'Sign in to continue with your purchase.' }
    );
  };

  const handleToggleWishlist = () => {
    guard(
      () => onToggleWishlist(product.productId || product.id),
      { message: 'Please sign in to save items to your wishlist.' }
    );
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
        <div className="space-y-6">
          <div className="aspect-square overflow-hidden rounded-2xl bg-secondary sticky top-28">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover object-center" />
          </div>
        </div>
        
        <div className="flex flex-col">
          {product.isBestseller && (
            <div className="mb-2 text-sm text-primary font-medium tracking-wider uppercase">Bestseller</div>
          )}
          <h1 className="text-3xl md:text-5xl font-serif text-foreground mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-2xl font-semibold text-primary">{formatPrice(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <>
                <span className="text-xl text-muted line-through">{formatPrice(product.originalPrice)}</span>
                <span className="bg-red-100 text-red-600 text-sm font-semibold px-2 py-1 rounded-md">Save {discount}%</span>
              </>
            )}
          </div>

          {/* ── Stock Status Badge ── */}
          <div className="mb-4">
            {stockLoading ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full"></span>
                Checking availability…
              </span>
            ) : isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-sm font-semibold px-3 py-1 rounded-full">
                🚫 Out of Stock
              </span>
            ) : stockInfo !== null ? (
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                ✅ In Stock
                {stockInfo.stockCount > 0 && stockInfo.stockCount <= 10 && (
                  <span className="text-orange-600 font-normal"> · Only {stockInfo.stockCount} left!</span>
                )}
              </span>
            ) : null}
          </div>
          
          <div className="mb-8">
            {product.description ? (
              <p className="text-base text-muted leading-relaxed">{product.description}</p>
            ) : (
              <p className="text-base text-gray-400 italic">No description available for this product.</p>
            )}
          </div>
          
          <div className="border-t border-border mb-8"></div>
          
          <div className="flex flex-col gap-4 mb-10">
            <div className="flex items-center gap-4">
              <div className={`flex items-center border border-border rounded-md h-12 ${isOutOfStock ? 'opacity-40 pointer-events-none' : ''}`}>
                <button className="px-4 h-full hover:bg-secondary transition-colors" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button className="px-4 h-full hover:bg-secondary transition-colors" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
              <button
                onClick={handleAddToCart}
                className={`flex-1 h-12 rounded-lg font-medium transition-all
                  ${isOutOfStock
                    ? 'text-white hover:shadow-lg hover:-translate-y-0.5'
                    : 'bg-primary text-white hover:shadow-xl hover:-translate-y-0.5'}`}
                style={isOutOfStock ? {
                  background: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                  border: '1.5px dashed rgba(255,255,255,0.4)'
                } : {}}
                title={isOutOfStock ? 'Out of stock — added to cart, but checkout will be blocked' : ''}
              >
                {isOutOfStock ? '🛒 Add to Cart (Out of Stock)' : 'Add to Cart'}
              </button>
            </div>

            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className={`w-full h-12 rounded-lg font-semibold transition-all
                ${isOutOfStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-foreground text-white hover:shadow-xl hover:-translate-y-0.5'}`}
              title={isOutOfStock ? 'Cannot buy out-of-stock items directly' : ''}
            >
              {isOutOfStock ? '🚫 Buy Now Unavailable' : '⚡ Buy Now'}
            </button>
            
            <div className="flex gap-4">
              <button onClick={handleToggleWishlist} className={`flex-1 h-12 border border-border rounded-lg hover:bg-secondary transition-colors ${isWishlisted ? 'border-primary text-primary bg-primary/5' : ''}`}>
                {isWishlisted ? '♥ Saved' : '♡ Save to Wishlist'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 py-6 border-t border-b border-border">
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-2xl">🛡️</span>
              <span className="text-sm font-medium">10 Year Warranty</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-2xl">🚚</span>
              <span className="text-sm font-medium">Free Delivery</span>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <span className="text-2xl">🔄</span>
              <span className="text-sm font-medium">30-day Returns</span>
            </div>
          </div>
          
          {/* Key Features & Specifications Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif text-foreground">Key Features & Specifications</h3>
              <button 
                onClick={fetchAttributes}
                disabled={loading}
                className="text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="Refresh attributes"
              >
                <span className={`text-sm ${loading ? 'animate-spin' : ''}`}>🔄</span>
                Refresh
              </button>
            </div>
            
            {loading ? (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-gray-600 text-sm">Loading attributes...</span>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <p className="text-red-600 text-sm">{error}</p>
                  <button 
                    onClick={fetchAttributes}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : attributes && attributes.length > 0 ? (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attributes.map((attribute, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {attribute.attributeName}
                        </div>
                        <div className="text-sm text-gray-600 break-words">
                          {attribute.attributeValue}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Attribute Count */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    {attributes.length} specification{attributes.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <div className="text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-gray-500 text-sm mb-2">
                    No specifications available yet
                  </p>
                  <p className="text-gray-400 text-xs">
                    Product attributes will appear here once added through the admin panel
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section — full width below product grid */}
      <ProductReviews productId={product?.productId || product?.id} />

      {/* ── Recommendations Section ── */}
      <RecommendationSection
        userId={getCurrentUserId()}
        currentProduct={product}
        onNavigateToProduct={onNavigateToProduct}
        onAddToCart={onAddToCart}
      />

      <ProductRecommendations
        product={product}
        onNavigate={(productId) => {
          if (onNavigateToProduct) {
            onNavigateToProduct(productId);
          }
        }}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};
