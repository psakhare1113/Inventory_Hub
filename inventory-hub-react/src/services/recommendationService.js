const API_BASE_URL = 'http://localhost:9999/api';

export const recommendationService = {
  // Track user visit to a product
  trackVisit: async (productId, categoryId, subcategoryId, userId = null) => {
    try {
      const params = new URLSearchParams({
        productId: productId.toString(),
        ...(categoryId && { categoryId: categoryId.toString() }),
        ...(subcategoryId && { subcategoryId: subcategoryId.toString() }),
        ...(userId && { userId: userId.toString() })
      });

      await fetch(`${API_BASE_URL}/recommendations/track-visit?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } catch (error) {
      console.error('Error tracking visit:', error);
    }
  },

  // Get recommendations for logged-in user
  getUserRecommendations: async (userId, limit = 8) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/user/${userId}?limit=${limit}`
      );
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching user recommendations:', error);
      return [];
    }
  },

  // Get recommendations for guest users
  getGuestRecommendations: async (productId, categoryId, subcategoryId, limit = 8) => {
    try {
      const params = new URLSearchParams({
        productId: productId.toString(),
        limit: limit.toString(),
        ...(categoryId && { categoryId: categoryId.toString() }),
        ...(subcategoryId && { subcategoryId: subcategoryId.toString() })
      });

      const response = await fetch(
        `${API_BASE_URL}/recommendations/guest?${params}`
      );
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching guest recommendations:', error);
      return [];
    }
  }
};