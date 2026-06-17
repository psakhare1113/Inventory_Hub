const API_BASE_URL = 'http://localhost:9999/api';

export const adminAnalyticsService = {
  // Get user analytics for admin dashboard
  getUserAnalytics: async (days = 30) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/admin/analytics/users?days=${days}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        }
      );
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      return null;
    }
  },

  // Get specific user activity
  getUserActivity: async (userId) => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/admin/analytics/users/${userId}/activity`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        }
      );
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      return null;
    }
  },

  // Track user login (call this when user logs in)
  trackLogin: async (userId, sessionToken) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/analytics/users/${userId}/track-login?sessionToken=${sessionToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error tracking login:', error);
      return false;
    }
  },

  // Track user logout
  trackLogout: async (userId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/analytics/users/${userId}/track-logout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error tracking logout:', error);
      return false;
    }
  },

  // Update user activity (call this periodically when user is active)
  updateActivity: async (userId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/analytics/users/${userId}/update-activity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      return response.ok;
    } catch (error) {
      console.error('Error updating activity:', error);
      return false;
    }
  }
};