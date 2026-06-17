import React, { useState, useEffect } from 'react';
import { formatPrice, wishlistManager } from '../data';
import { icons } from '../utils/icons';
import { useAuthGuard } from '../hooks/useAuthGuard';

// Inventory check — uses direct public route (no auth needed, gateway allows /api/inventory/**)
const checkInventoryAvailability = async (productId) => {
  try {
    const res = await fetch(
      `http://localhost:9999/api/inventory/stock/availability?productId=${productId}`
    );
    if (!res.ok) return null;
    return await res.json(); // { productId, available: bool, stockCount: number }
  } catch {
    return null;
  }
};

export const ProductCard = ({ product, compareProducts, wishlist, onNavigate, onAddToCart, onToggleWishlist, onAddToCompare }) => {
  // Use wishlist prop (reactive state from App) when available, fall back to localStorage for standalone usage
  const isWishlisted = wishlist
    ? wishlist.map(Number).includes(Number(product.id))
    : wishlistManager.has(product.id);
  const isCompared = compareProducts.some(p => p.id === product.id);
  const guard = useAuthGuard();

  const [stockInfo, setStockInfo] = useState(null);

  useEffect(() => {
    if (product.id) {
      checkInventoryAvailability(product.id).then(setStockInfo);
    }
  }, [product.id]);

  const handleAddToCart = () => {
    // Add to cart is allowed for guests — no auth required
    onAddToCart(product.id);
  };

  const handleToggleWishlist = () => {
    guard(
      () => onToggleWishlist(product.id),
      { message: 'Please sign in to save items to your wishlist.' }
    );
  };

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300">
      <div className="relative aspect-square overflow-hidden">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
          onClick={() => onNavigate('product', { productId: product.id })}
        />
        
        {/* Badges — stacked top-left */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
          {product.isBestseller && (
            <div style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', letterSpacing: '0.3px', boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>
              🏆 BESTSELLER
            </div>
          )}
          {product.freeShipping && (
            <div style={{ background: '#0ea5e9', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '999px', letterSpacing: '0.3px', boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>
              🚚 FREE SHIPPING
            </div>
          )}
        </div>

        {/* Discount badge */}
        {(() => {
          const disc = product.discount != null && product.discount > 0
            ? Math.round(product.discount)
            : (product.originalPrice > 0 && product.price > 0 && product.originalPrice > product.price
                ? Math.round((product.originalPrice - product.price) / product.originalPrice * 100)
                : 0);
          if (disc <= 0) return null;
          const badgeCount = (product.isBestseller ? 1 : 0) + (product.freeShipping ? 1 : 0);
          const topOffset = 16 + badgeCount * 30;
          return (
            <div
              style={{
                position: 'absolute',
                top: `${topOffset}px`,
                left: '16px',
                background: '#22c55e',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '999px',
                zIndex: 10,
                letterSpacing: '0.3px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
            >
              -{disc}% OFF
            </div>
          );
        })()}

        {/* ── Out of Stock badge ── */}
        {(stockInfo && !stockInfo.available) ? (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '0',
            right: '0',
            margin: '0 auto',
            width: 'fit-content',
            background: 'rgba(220,38,38,0.92)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '700',
            padding: '4px 14px',
            borderRadius: '999px',
            letterSpacing: '0.5px',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            OUT OF STOCK
          </div>
        ) : null}
        
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button 
            onClick={handleToggleWishlist}
            className={`h-10 w-10 rounded-full bg-white shadow-lg hover:bg-primary hover:text-white flex items-center justify-center transition-all ${isWishlisted ? 'bg-primary text-white' : 'text-gray-900'}`}
            title="Save to wishlist"
          >
            {icons.heart(isWishlisted)}
          </button>
          <button 
            onClick={() => onAddToCompare(product.id)}
            className={`h-10 w-10 rounded-full bg-white shadow-lg hover:bg-primary hover:text-white flex items-center justify-center transition-all ${isCompared ? 'bg-primary text-white' : 'text-gray-600'}`}
            title="Compare"
          >
            {icons.scale}
          </button>
        </div>
      </div>

      {/* ── Add to Cart button — always visible below image ── */}
      <div className="px-4 pb-3 pt-1">
        <button
          onClick={handleAddToCart}
          className="w-full font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm bg-primary text-white hover:bg-primary/90 active:scale-95"
        >
          {icons.cart} Add to Cart
        </button>
      </div>
      
      <div className="px-4 pb-4">
        <h3 
          className="font-semibold text-lg text-gray-800 mb-2 truncate cursor-pointer hover:text-primary transition-colors"
          onClick={() => onNavigate('product', { productId: product.id })}
        >
          {product.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {product.price > 0 ? (
            <>
              <span className="text-2xl font-bold text-gray-800">{formatPrice(product.price)}</span>
              {product.originalPrice > 0 && product.originalPrice > product.price && (
                <>
                  <span className="text-sm text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
                  {(() => {
                    const disc = product.discount != null
                      ? Math.round(product.discount)
                      : Math.round((product.originalPrice - product.price) / product.originalPrice * 100);
                    return disc > 0 ? (
                      <span className="text-xs font-bold text-white bg-green-500 px-2 py-0.5 rounded-full">
                        -{disc}% off
                      </span>
                    ) : null;
                  })()}
                </>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400 italic">Price not available</span>
          )}
        </div>
        {product.unitSize && product.unitLabel && (
          <p className="text-xs text-gray-500 mt-1">{product.unitSize} {product.unitLabel}</p>
        )}
      </div>
    </div>
  );
};
