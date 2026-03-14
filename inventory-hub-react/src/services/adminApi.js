const API_BASE_URL = 'http://localhost:9999/api';
const AUTH_BASE_URL = 'http://localhost:9999/api/auth';

export const adminService = {
  customers: {
    getAllCustomers: async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${AUTH_BASE_URL}/admin/customers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    }
  },

  orders: {
    getAllOrders: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    }
  },

  analytics: {
    getDashboardStats: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analytics`);
        return response.ok ? await response.json() : {};
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {};
      }
    }
  }
};

export const adminApi = adminService;
