import React, { useState, useEffect } from 'react';
import { formatPrice } from '../data';
import { icons } from '../utils/icons';

// Check inventory for all cart items before checkout
const checkCartInventory = async (cartItems) => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const results = [];
  for (const item of cartItems) {
    const productId = item.product?.id ?? item.productId;
    const productName = item.product?.name ?? 'Unknown Product';

    if (!productId) {
      // No product ID — skip, don't block
      results.push({ productId: null, name: productName, requestedQty: item.quantity, available: true, stockCount: 99 });
      continue;
    }

    try {
      const res = await fetch(
        `http://localhost:9999/api/inventory/stock/availability?productId=${productId}`,
        { headers: authHeaders }
      );
      if (res.ok) {
        const data = await res.json(); // { productId, available, stockCount, stockLevel }
        const stockCount = Number(data.stockCount ?? 0);
        const requestedQty = Number(item.quantity ?? 1);
        // Block only if explicitly not available OR stock is less than requested
        const isAvailable = data.available === true && stockCount >= requestedQty;
        results.push({
          productId,
          name: productName,
          requestedQty,
          available: isAvailable,
          stockCount,
        });
      } else {
        // Non-ok response — don't block checkout
        results.push({ productId, name: productName, requestedQty: item.quantity, available: true, stockCount: 99 });
      }
    } catch {
      // Network error — don't block checkout
      results.push({ productId, name: productName, requestedQty: item.quantity, available: true, stockCount: 99 });
    }
  }
  return results;
};

export const CartDrawer = ({ showCart, cart, onToggleCart, onUpdateQuantity, onRemove, onCheckout, onNavigate, isAuthenticated, onRequireAuth }) => {
  const [cartWithPricing, setCartWithPricing] = useState([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [stockErrors, setStockErrors] = useState([]); // items that are out of stock

  // Fetch real-time pricing for cart items
  const updateCartPricing = async () => {
    if (cart.length === 0) {
      setCartWithPricing([]);
      return;
    }

    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const authHeaders = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
      const productIds = cart.map(item => item.product?.id).filter(Boolean);
      console.log('Cart product IDs:', productIds);
      
      // Try multiple API endpoints with auth headers
      const endpoints = [
        `http://localhost:9999/api/auth/user/products/priceByProductId?productIds=${productIds.join(',')}`,
        `http://localhost:9999/api/products/priceByProductId?productIds=${productIds.join(',')}`
      ];
      
      let pricingData = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log('Trying endpoint:', endpoint);
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: authHeaders
          });
          
          if (response.ok) {
            pricingData = await response.json();
            console.log('Pricing data received from:', endpoint, pricingData);
            break;
          }
        } catch (err) {
          console.warn('Endpoint failed:', endpoint, err.message);
        }
      }
      
      if (pricingData) {
        const updatedCart = cart.map(item => {
          const pricing = pricingData[item.product.id];
          // Ensure we always have a valid price
          const updatedPrice = pricing?.sellingPrice || item.product.price || item.product.originalPrice || 0;
          console.log(`Product ${item.product.id}: ${item.product.price} -> ${updatedPrice}`);
          
          return {
            ...item,
            product: {
              ...item.product,
              price: updatedPrice > 0 ? updatedPrice : item.product.price || 0
            }
          };
        });
        setCartWithPricing(updatedCart);
      } else {
        console.warn('All pricing endpoints failed, ensuring original prices');
        // Ensure original prices are preserved
        const cartWithOriginalPrices = cart.map(item => ({
          ...item,
          product: {
            ...item.product,
            price: item.product.price || item.product.originalPrice || 0
          }
        }));
        setCartWithPricing(cartWithOriginalPrices);
      }
    } catch (error) {
      console.error('Error updating cart pricing:', error);
      setCartWithPricing(cart);
    }
  };

  // Re-fetch pricing when cart/drawer changes
  useEffect(() => {
    if (cart.length > 0) {
      updateCartPricing();
    } else {
      setCartWithPricing([]);
    }
    setStockErrors([]);
  }, [cart, showCart]);

  // Re-fetch pricing when admin updates/deletes a price
  useEffect(() => {
    const handlePricingUpdated = () => {
      if (cart.length > 0) updateCartPricing();
    };
    window.addEventListener('pricingUpdated', handlePricingUpdated);
    return () => window.removeEventListener('pricingUpdated', handlePricingUpdated);
  }, [cart]);

  // Checkout with auth check + inventory validation
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Auth guard — unauthenticated users see sign-in modal
    if (!isAuthenticated) {
      if (onRequireAuth) {
        onRequireAuth({ message: 'Sign in to continue with your order.' });
      }
      return;
    }

    setCheckingOut(true);
    setStockErrors([]);
    try {
      const inventoryResults = await checkCartInventory(cartWithPricing.length > 0 ? cartWithPricing : cart);
      const outOfStock = inventoryResults.filter(r => r.available === false);
      if (outOfStock.length > 0) {
        setStockErrors(outOfStock);
        return;
      }
      setStockErrors([]);
      onCheckout();
    } catch (err) {
      console.error('Inventory check failed:', err);
      onCheckout(); // graceful degradation
    } finally {
      setCheckingOut(false);
    }
  };

  const total = cartWithPricing.reduce((sum, item) => {
    if (!item.product || typeof item.product.price !== 'number') {
      return sum;
    }
    return sum + (item.product.price * item.quantity);
  }, 0);
  
  return (
    <div className={`fixed inset-0 z-[100] ${showCart ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        className={`absolute inset-0 bg-black/50 transition-opacity ${showCart ? 'opacity-100' : 'opacity-0'}`}
        onClick={onToggleCart}
      ></div>
      
      <div className={`absolute top-0 right-0 bottom-0 w-[400px] max-w-[90vw] bg-white shadow-2xl transform transition-transform ${showCart ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-serif">Shopping Cart</h2>
          <button onClick={onToggleCart} className="text-2xl text-muted hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted mb-6">Your cart is empty</p>
              <button 
                onClick={() => { onToggleCart(); onNavigate('shop'); }}
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:shadow-xl transition-all"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cartWithPricing.map(item => {
              if (!item.product) {
                return null;
              }
              return (
                <div key={item.id} className="flex gap-4 p-4 border-b border-border">
                  <img
                    src={item.product.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'}
                    alt={item.product.name || 'Product'}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600'; }}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{item.product.name || 'Unknown Product'}</h4>
                    <p className="text-sm text-primary font-semibold mb-2">{formatPrice(item.product.price || 0)}</p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 bg-primary text-white rounded flex items-center justify-center"
                      >−</button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 bg-primary text-white rounded flex items-center justify-center"
                      >+</button>
                    </div>
                  </div>
                  <button onClick={() => onRemove(item.id)} className="text-red-500 hover:text-red-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              );
            }).filter(Boolean)
          )}
        </div>
        
        {cart.length > 0 && (
          <div className="p-6 border-t border-border">
            <div className="flex justify-between text-lg font-semibold mb-4">
              <span>Total:</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>

            {/* Stock error messages */}
            {stockErrors.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">
                <p className="font-semibold mb-1">⚠️ Some items are out of stock:</p>
                <ul className="list-disc list-inside space-y-1">
                  {stockErrors.map((err, i) => (
                    <li key={i}>
                      <strong>{err.name}</strong> —{' '}
                      {err.stockCount === 0
                        ? 'Out of stock. Please wait, stock will be available soon.'
                        : `Only ${err.stockCount} unit(s) available (you requested ${err.requestedQty}). Please wait for restock.`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button 
              onClick={handleCheckout}
              disabled={checkingOut}
              className={`w-full py-4 rounded-lg font-medium transition-all
                ${checkingOut
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:shadow-xl'}`}
            >
              {checkingOut ? '⏳ Checking availability...' : 'Checkout'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
