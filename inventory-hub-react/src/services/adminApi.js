const API_BASE_URL = 'http://localhost:9999/api';
const AUTH_BASE_URL = 'http://localhost:9999/api/auth';

// Admin login stores the token in sessionStorage to keep it tab-specific.
// Fall back to localStorage keys used by the regular login flow.
const getToken = () =>
  sessionStorage.getItem('adminToken') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');
const getAuthHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const adminService = {
  customers: {
    getAllCustomers: async () => {
      try {
        const token = getToken();
        if (!token) {
          console.warn('No token found');
        }
        
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${AUTH_BASE_URL}/admin/customers`, {
          headers
        });
        
        if (response.ok) {
          return await response.json();
        } else {
          console.warn('Failed to fetch customers:', response.status);
          return [];
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    },

    promoteUserToAdmin: async (customerId) => {
      try {
        const token = getToken();
        const response = await fetch(`${AUTH_BASE_URL}/admin/promote?customerId=${customerId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          // If the promoted user is the currently logged-in user, update their role
          const currentUserId = localStorage.getItem('customerId') || localStorage.getItem('userId');
          if (String(customerId) === String(currentUserId)) {
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('userRole', 'ADMIN');
            localStorage.setItem('currentView', 'admin');
            window.dispatchEvent(new CustomEvent('roleChanged', { detail: { newRole: 'ADMIN' } }));
          }
          return result;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to promote user');
        }
      } catch (error) {
        console.error('Error promoting user:', error);
        throw error;
      }
    },

    demoteAdminToUser: async (customerId) => {
      try {
        const token = getToken();
        const response = await fetch(`${AUTH_BASE_URL}/admin/demote?customerId=${customerId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          return result;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to demote admin');
        }
      } catch (error) {
        console.error('Error demoting admin:', error);
        throw error;
      }
    },

    updateCustomerStatus: async (customerId, status) => {
      try {
        const token = getToken();
        const response = await fetch(`${AUTH_BASE_URL}/admin/customer/status?customerId=${customerId}&status=${status}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          return result;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update customer status');
        }
      } catch (error) {
        console.error('Error updating customer status:', error);
        throw error;
      }
    },

    getAllAdmins: async () => {
      try {
        const token = getToken();
        const response = await fetch(`${AUTH_BASE_URL}/admin/get`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching admins:', error);
        return [];
      }
    },

    removeAdmin: async (email) => {
      try {
        const token = getToken();
        const response = await fetch(`${AUTH_BASE_URL}/admin/delete?email=${email}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.text();
          return { message: result };
        } else {
          const error = await response.text();
          throw new Error(error || 'Failed to remove admin');
        }
      } catch (error) {
        console.error('Error removing admin:', error);
        throw error;
      }
    }
  },

  orders: {
    getAllOrders: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/orders/all`, {
          headers: getAuthHeaders()
        });
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
        const response = await fetch(
          `${API_BASE_URL}/auth/admin/inventory/analytics/sales/daily?type=SALE`,
          { headers: getAuthHeaders() }
        );
        return response.ok ? await response.json() : {};
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {};
      }
    }
  }
};

export const adminApi = adminService;
