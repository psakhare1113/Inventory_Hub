import { formatPrice } from '../../data.js';
import { icons } from '../utils/icons.js';

export const CartDrawer = (state) => {
  const total = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  return `
    <div class="fixed inset-0 z-[100] ${state.showCart ? 'pointer-events-auto' : 'pointer-events-none'}">
      <div class="absolute inset-0 bg-black/50 transition-opacity ${state.showCart ? 'opacity-100' : 'opacity-0'}" 
           onclick="toggleCart()"></div>
      
      <div class="absolute top-0 right-0 bottom-0 w-[400px] max-w-[90vw] bg-white shadow-2xl transform transition-transform ${state.showCart ? 'translate-x-0' : 'translate-x-full'} flex flex-col">
        <div class="flex justify-between items-center p-6 border-b border-border">
          <h2 class="text-xl font-serif">Shopping Cart</h2>
          <button onclick="toggleCart()" class="text-2xl text-muted hover:text-foreground">${icons.close}</button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4">
          ${state.cart.length === 0 ? 
            '<p class="text-center text-muted py-12">Your cart is empty</p>' : 
            state.cart.map(item => `
              <div class="flex gap-4 p-4 border-b border-border">
                <img src="${item.product.imageUrl}" alt="${item.product.name}" class="w-20 h-20 object-cover rounded-lg">
                <div class="flex-1">
                  <h4 class="font-medium mb-1">${item.product.name}</h4>
                  <p class="text-sm text-primary font-semibold mb-2">${formatPrice(item.product.price)}</p>
                  <div class="flex items-center gap-2">
                    <button onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})" 
                            class="w-7 h-7 bg-primary text-white rounded flex items-center justify-center">−</button>
                    <span class="w-8 text-center">${item.quantity}</span>
                    <button onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})" 
                            class="w-7 h-7 bg-primary text-white rounded flex items-center justify-center">+</button>
                  </div>
                </div>
                <button onclick="removeFromCart(${item.id})" class="text-red-500 hover:text-red-700">🗑️</button>
              </div>
            `).join('')}
        </div>
        
        ${state.cart.length > 0 ? `
          <div class="p-6 border-t border-border">
            <div class="flex justify-between text-lg font-semibold mb-4">
              <span>Total:</span>
              <span class="text-primary">${formatPrice(total)}</span>
            </div>
            <button onclick="checkout()" 
                    class="w-full py-4 bg-primary text-white rounded-lg font-medium hover:shadow-xl transition-all">
              Checkout
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
};
