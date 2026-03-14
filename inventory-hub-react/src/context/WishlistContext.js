import React, { createContext, useContext, useState } from 'react';
import { wishlistManager } from '../data';

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState(wishlistManager.get());

  const toggleWishlist = (productId) => {
    wishlistManager.toggle(productId);
    setWishlist(wishlistManager.get());
  };

  const isInWishlist = (productId) => {
    return wishlistManager.has(productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
