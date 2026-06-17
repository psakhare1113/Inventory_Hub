import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';

import enhancedProductsService from '../services/enhancedProductsService';
import OrderHistory from '../components/OrderHistory/OrderHistory';

const fetchAllPricing = async () => {
  try {
    const response = await fetch('http://localhost:9999/api/products/pricing', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const list = await response.json();
      return Array.isArray(list)
        ? list.reduce((map, p) => { map[p.productId] = p; return map; }, {})
        : {};
    }
  } catch (e) {}
  return {};
};

export const ProfilePage = ({ wishlist, orderHistory, profileTab, setProfileTab, compareProducts, onNavigate, onAddToCart, onToggleWishlist, onAddToCompare, onSignOut }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Read real user info from localStorage
  const firstName = localStorage.getItem('firstName') || '';
  const lastName = localStorage.getItem('lastName') || '';
  const email = localStorage.getItem('email') || localStorage.getItem('username') || 'user@example.com';
  const customerId = localStorage.getItem('customerId');
  const displayName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'My Account';
  const initials = (firstName && lastName)
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : (firstName ? firstName[0].toUpperCase() : 'U');

  const avatarColors = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-rose-500 to-rose-600',
    'bg-gradient-to-br from-amber-500 to-amber-600',
    'bg-gradient-to-br from-cyan-500 to-cyan-600',
  ];
  const avatarColor = avatarColors[(parseInt(customerId, 10) || 0) % avatarColors.length];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const [result, pricingMap] = await Promise.all([
          enhancedProductsService.fetchAllProducts(),
          fetchAllPricing(),
        ]);
        if (result.success && result.data.length > 0) {
          const mapped = result.data.map(product => {
            const p = pricingMap[product.productId] || {};
            return {
              id: product.productId,
              name: product.name || product.productBarcode,
              price: parseFloat(p.sellingPrice) || product.price || 0,
              originalPrice: parseFloat(p.mrp) || 0,
              discount: p.discount != null ? parseFloat(p.discount) : null,
              unitSize: p.unitSize || '',
              unitLabel: p.unitLabel || '',
              imageUrl: product.productUrl || '/placeholder.jpg',
              categoryId: product.categoryId,
              subcategoryId: product.subcategoryId,
              status: product.status,
              description: product.description || '',
              rating: product.rating || 0,
            };
          });
          setAllProducts(mapped);
        }
      } catch (error) {
        console.error('Error loading products for wishlist:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const wishlistProducts = allProducts.filter(p => wishlist.map(id => Number(id)).includes(Number(p.id)));
  const [reviewingItem, setReviewingItem] = useState(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const handleSubmitReview = (orderId, itemId) => {
    console.log('Review submitted:', { orderId, itemId, rating, reviewText });
    setReviewingItem(null);
    setRating(0);
    setReviewText('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row gap-12">
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-secondary/30 rounded-2xl p-6 border border-border sticky top-28">
            <div className="flex items-center gap-4 mb-8">
              <div className={`h-12 w-12 rounded-full ${avatarColor} text-white flex items-center justify-center text-xl font-bold`}>
                {initials}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{displayName}</span>
                <span className="text-xs text-muted">{email}</span>
              </div>
            </div>

            <nav className="flex flex-col gap-2">
              <button 
                onClick={() => setProfileTab('orders')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${profileTab === 'orders' ? 'bg-primary text-white shadow-md' : 'hover:bg-secondary text-muted'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Order History
              </button>
              <button 
                onClick={() => setProfileTab('wishlist')}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${profileTab === 'wishlist' ? 'bg-primary text-white shadow-md' : 'hover:bg-secondary text-muted'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Saved Wishlist
              </button>
            </nav>

            <div className="mt-8 pt-6 border-t border-border">
              <button 
                onClick={onSignOut}
                className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-h-[500px]">
          {profileTab === 'orders' && (
            <div>
              <OrderHistory />
            </div>
          )}

          {profileTab === 'wishlist' && (
            <div>
            <h2 className="text-3xl font-serif mb-6">Saved Wishlist</h2>
            
            {loading ? (
              <div className="text-center py-20 text-muted">Loading wishlist...</div>
            ) : wishlistProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10">
                {wishlistProducts.map(p => (
                  <ProductCard 
                    key={p.id}
                    product={p}
                    wishlist={wishlist}
                    compareProducts={compareProducts}
                    onNavigate={onNavigate}
                    onAddToCart={onAddToCart}
                    onToggleWishlist={onToggleWishlist}
                    onAddToCompare={onAddToCompare}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-secondary/20 rounded-2xl border border-dashed border-border">
                <svg className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <h3 className="text-xl font-serif mb-2">Your wishlist is empty</h3>
                <p className="text-muted mb-6">Save items you love to view them later.</p>
                <button onClick={() => onNavigate('shop')} className="px-6 py-3 bg-primary text-white rounded-lg font-medium">Explore Products</button>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
