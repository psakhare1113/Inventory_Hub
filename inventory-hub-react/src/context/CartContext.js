import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartManager } from '../data';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Load cart with products on mount (async)
  useEffect(() => {
    cartManager.getWithProducts().then(setCart).catch(() => setCart([]));
  }, []);

  const refreshCart = async () => {
    const updated = await cartManager.getWithProducts();
    setCart(updated);
  };

  const addToCart = async (productId) => {
    cartManager.add(productId);
    await refreshCart();
  };

  const updateQuantity = async (id, quantity) => {
    if (quantity < 1) {
      await removeFromCart(id);
    } else {
      cartManager.update(id, quantity);
      await refreshCart();
    }
  };

  const removeFromCart = async (id) => {
    cartManager.remove(id);
    await refreshCart();
  };

  const clearCart = () => {
    cartManager.clear();
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
