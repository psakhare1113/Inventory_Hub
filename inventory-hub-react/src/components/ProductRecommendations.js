import React, { useState, useEffect, useRef, useCallback } from 'react';
import { imsService } from '../services/imsApi';
import { formatPrice } from '../data';
import './ProductRecommendations.css';

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ value = 0, size = 13 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= Math.round(value) ? '#f59e0b' : '#d1d5db', lineHeight: 1 }}>
          ★
        </span>
      ))}
    </span>
  );
}

// ── Single Product Card ───────────────────────────────────────────────────────
function RecommendationCard({ product, pricing, onNavigate, onAddToCart }) {
  const [imgError, setImgError] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const price       = pricing?.sellingPrice || product.price || 0;
  const originalPrice = pricing?.mrp || product.originalPrice || null;
  const discount    = originalPrice && originalPrice > price
    ? Math.round((1 - price / originalPrice) * 100)
    : 0;
  const imageUrl    = product.productUrl || product.imageUrl || '';

  const handleAddToCart = (e) => {
    e.stopPropagation();
    onAddToCart(product.productId || product.id);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1800);
  };

  return (
    <div className="rec-card" onClick={() => onNavigate(product.productId || product.id)}>
      {/* Discount badge */}
      {discount > 0 && (
        <div className="rec-card__badge">{discount}% OFF</div>
      )}

      {/* Image */}
      <div className="rec-card__img-wrap">
        {!imgError && imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="rec-card__img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="rec-card__img-placeholder">
            <span>🛋️</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rec-card__body">
        <p className="rec-card__name" title={product.name}>{product.name}</p>

        {(product.rating > 0) && (
          <div className="rec-card__rating">
            <StarRating value={product.rating} />
            <span className="rec-card__rating-val">{Number(product.rating).toFixed(1)}</span>
          </div>
        )}

        <div className="rec-card__price-row">
          <span className="rec-card__price">{formatPrice(price)}</span>
          {originalPrice && originalPrice > price && (
            <span className="rec-card__original">{formatPrice(originalPrice)}</span>
          )}
        </div>

        <button
          className={`rec-card__btn ${addedToCart ? 'rec-card__btn--added' : ''}`}
          onClick={handleAddToCart}
        >
          {addedToCart ? '✓ Added' : '+ Cart'}
        </button>
      </div>
    </div>
  );
}

// ── Horizontal Scroll Row ─────────────────────────────────────────────────────
function ScrollRow({ products, pricingMap, onNavigate, onAddToCart, loading }) {
  const rowRef = useRef(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = rowRef.current;
    if (el) el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [products, checkScroll]);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="rec-row rec-row--loading">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rec-skeleton">
            <div className="rec-skeleton__img" />
            <div className="rec-skeleton__line rec-skeleton__line--wide" />
            <div className="rec-skeleton__line" />
            <div className="rec-skeleton__line rec-skeleton__line--short" />
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="rec-scroll-wrap">
      {canScrollLeft && (
        <button className="rec-arrow rec-arrow--left" onClick={() => scroll(-1)} aria-label="Scroll left">
          ‹
        </button>
      )}
      <div className="rec-row" ref={rowRef}>
        {products.map(p => (
          <RecommendationCard
            key={p.productId || p.id}
            product={p}
            pricing={pricingMap[p.productId || p.id]}
            onNavigate={onNavigate}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
      {canScrollRight && (
        <button className="rec-arrow rec-arrow--right" onClick={() => scroll(1)} aria-label="Scroll right">
          ›
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
/**
 * ProductRecommendations
 *
 * Shows two sections below the product detail:
 *  1. "Similar Products"  — same subcategory (Related)
 *  2. "You May Also Like" — same category, different subcategory (Relevant)
 *
 * Props:
 *  - product      : current product object { productId/id, categoryId, subcategoryId }
 *  - onNavigate   : (productId) => void  — navigate to that product's detail page
 *  - onAddToCart  : (productId) => void
 */
export default function ProductRecommendations({ product, onNavigate, onAddToCart }) {
  const [related,    setRelated]    = useState([]);
  const [relevant,   setRelevant]   = useState([]);
  const [pricingMap, setPricingMap] = useState({});
  const [loadingRel, setLoadingRel] = useState(true);
  const [loadingRev, setLoadingRev] = useState(true);

  const productId    = product?.productId || product?.id;
  const categoryId   = product?.categoryId;
  const subcategoryId = product?.subcategoryId;

  // Fetch pricing once and build a map { productId -> pricing }
  useEffect(() => {
    imsService.pricing.getAllPricing().then(list => {
      const map = {};
      (list || []).forEach(p => { map[p.productId] = p; });
      setPricingMap(map);
    }).catch(() => {});
  }, []);

  // Fetch Related (same subcategory)
  useEffect(() => {
    if (!productId || !subcategoryId) { setLoadingRel(false); return; }
    setLoadingRel(true);
    imsService.products
      .getRelatedProducts(productId, subcategoryId, 10)
      .then(data => setRelated(Array.isArray(data) ? data : []))
      .catch(() => setRelated([]))
      .finally(() => setLoadingRel(false));
  }, [productId, subcategoryId]);

  // Fetch Relevant (same category, different subcategory)
  useEffect(() => {
    if (!productId || !categoryId || !subcategoryId) { setLoadingRev(false); return; }
    setLoadingRev(true);
    imsService.products
      .getRelevantProducts(productId, categoryId, subcategoryId, 10)
      .then(data => setRelevant(Array.isArray(data) ? data : []))
      .catch(() => setRelevant([]))
      .finally(() => setLoadingRev(false));
  }, [productId, categoryId, subcategoryId]);

  const hasRelated  = loadingRel  || related.length  > 0;
  const hasRelevant = loadingRev  || relevant.length > 0;

  if (!hasRelated && !hasRelevant) return null;

  return (
    <div className="rec-root">

      {/* ── Similar Products (Related) ── */}
      {hasRelated && (
        <section className="rec-section">
          <div className="rec-section__header">
            <div className="rec-section__title-wrap">
              <span className="rec-section__icon">🔗</span>
              <h2 className="rec-section__title">Similar Products</h2>
            </div>
            <p className="rec-section__sub">More from the same collection</p>
          </div>
          <ScrollRow
            products={related}
            pricingMap={pricingMap}
            onNavigate={onNavigate}
            onAddToCart={onAddToCart}
            loading={loadingRel}
          />
        </section>
      )}

      {/* ── You May Also Like (Relevant) ── */}
      {hasRelevant && (
        <section className="rec-section">
          <div className="rec-section__header">
            <div className="rec-section__title-wrap">
              <span className="rec-section__icon">✨</span>
              <h2 className="rec-section__title">You May Also Like</h2>
            </div>
            <p className="rec-section__sub">Explore more from this category</p>
          </div>
          <ScrollRow
            products={relevant}
            pricingMap={pricingMap}
            onNavigate={onNavigate}
            onAddToCart={onAddToCart}
            loading={loadingRev}
          />
        </section>
      )}

    </div>
  );
}
