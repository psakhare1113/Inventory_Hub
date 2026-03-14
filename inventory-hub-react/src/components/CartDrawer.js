import React from 'react';
import { formatPrice } from '../data';
import { icons } from '../utils/icons';

export const CartDrawer = ({ showCart, cart, onToggleCart, onUpdateQuantity, onRemove, onCheckout, onNavigate }) => {
  const total = cart.reduce((sum, item) => {
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
            cart.map(item => {
              if (!item.product) {
                return null;
              }
              return (
                <div key={item.id} className="flex gap-4 p-4 border-b border-border">
                  <img src={item.product.imageUrl || '/placeholder.jpg'} alt={item.product.name || 'Product'} className="w-20 h-20 object-cover rounded-lg" />
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
            <button 
              onClick={onCheckout}
              className="w-full py-4 bg-primary text-white rounded-lg font-medium hover:shadow-xl transition-all"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
