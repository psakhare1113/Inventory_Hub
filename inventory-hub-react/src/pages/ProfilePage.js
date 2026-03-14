import React, { useState, useEffect } from 'react';
import { ProductCard } from '../components/ProductCard';
import { formatPrice, getAllProducts } from '../data';

export const ProfilePage = ({ wishlist, orderHistory, profileTab, setProfileTab, compareProducts, onNavigate, onAddToCart, onToggleWishlist, onAddToCompare, onSignOut }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await getAllProducts();
        setAllProducts(products);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const wishlistProducts = allProducts.filter(p => wishlist.includes(p.id));
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
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                U
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">My Account</span>
                <span className="text-xs text-muted">user@example.com</span>
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
              <h2 className="text-3xl font-serif mb-6">Order History</h2>
              
              {orderHistory && orderHistory.length > 0 ? (
                <div className="space-y-6">
                  {orderHistory.map(order => (
                    <div key={order.id} className="border border-border rounded-xl p-6 bg-card shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 pb-4 border-b border-border/50">
                        <div>
                          <p className="text-sm text-muted mb-1">Order Number</p>
                          <p className="font-semibold">#{order.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted mb-1">Date Placed</p>
                          <p className="font-medium">{order.date}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted mb-1">Total Amount</p>
                          <p className="font-medium">{formatPrice(order.total)}</p>
                        </div>
                        <div>
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider bg-amber-100 text-amber-700">
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm font-medium">Items:</p>
                        {order.items.map(item => (
                          <div key={item.id} className="border-b border-border/30 pb-3 mb-3 last:border-0">
                            <div className="flex items-center gap-3 text-sm mb-2">
                              <img src={item.product.imageUrl} alt={item.product.name} className="w-12 h-12 object-cover rounded" />
                              <span className="flex-1">{item.product.name}</span>
                              <span className="text-muted">Qty: {item.quantity}</span>
                              <span className="font-medium">{formatPrice(item.product.price * item.quantity)}</span>
                            </div>
                            <div className="flex gap-2 ml-15">
                              <button className="px-3 py-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded hover:bg-amber-100 transition-colors">
                                ↻ Buy Again
                              </button>
                              {reviewingItem === `${order.id}-${item.id}` ? (
                                <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  <div className="flex gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span
                                        key={star}
                                        className={`cursor-pointer text-xl ${rating >= star ? 'text-amber-400' : 'text-gray-300'}`}
                                        onClick={() => setRating(star)}
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                  <textarea
                                    className="w-full p-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Share your experience..."
                                    value={reviewText}
                                    onChange={(e) => setReviewText(e.target.value)}
                                    rows={3}
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button 
                                      className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                                      onClick={() => handleSubmitReview(order.id, item.id)}
                                    >
                                      Submit
                                    </button>
                                    <button 
                                      className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                                      onClick={() => {
                                        setReviewingItem(null);
                                        setRating(0);
                                        setReviewText('');
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  className="px-3 py-1.5 text-xs bg-white border border-primary text-primary rounded hover:bg-blue-50 transition-colors"
                                  onClick={() => setReviewingItem(`${order.id}-${item.id}`)}
                                >
                                  ✍️ Write Review
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <button className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors">
                          View Invoice
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-secondary/20 rounded-2xl border border-dashed border-border">
                  <svg className="w-16 h-16 text-muted mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-xl font-serif mb-2">No orders yet</h3>
                  <p className="text-muted mb-6">When you place an order, it will appear here.</p>
                  <button onClick={() => onNavigate('shop')} className="px-6 py-3 bg-primary text-white rounded-lg font-medium">Start Shopping</button>
                </div>
              )}
            </div>
          )}

          {profileTab === 'wishlist' && (
            <div>
            <h2 className="text-3xl font-serif mb-6">Saved Wishlist</h2>
            
            {wishlistProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10">
                {wishlistProducts.map(p => (
                  <ProductCard 
                    key={p.id}
                    product={p}
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
