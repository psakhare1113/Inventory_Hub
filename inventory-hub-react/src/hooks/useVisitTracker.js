import { useEffect } from 'react';
import { recommendationService } from '../services/recommendationService';

export const useVisitTracker = () => {
  const trackVisit = (product, userId = null) => {
    if (!product) return;
    
    const productId = product.productId || product.id;
    const categoryId = product.categoryId;
    const subcategoryId = product.subcategoryId;
    
    // Get user ID from localStorage if not provided
    const currentUserId = userId || getCurrentUserId();
    
    recommendationService.trackVisit(productId, categoryId, subcategoryId, currentUserId);
  };

  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return null;
      
      // Decode JWT token to get user ID (basic implementation)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.sub || payload.id;
    } catch (error) {
      console.error('Error getting user ID from token:', error);
      return null;
    }
  };

  return { trackVisit, getCurrentUserId };
};