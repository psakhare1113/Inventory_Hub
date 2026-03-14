import React, { createContext, useContext, useState } from 'react';
import { cartManager } from '../data';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(cartManager.getWithProducts());

  const addToCart = (productId) => {
    cartManager.add(productId);
    setCart(cartManager.getWithProducts());
  };

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) {
      removeFromCart(id);
    } else {
      cartManager.update(id, quantity);
      setCart(cartManager.getWithProducts());
    }
  };

  const removeFromCart = (id) => {
    cartManager.remove(id);
    setCart(cartManager.getWithProducts());
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
