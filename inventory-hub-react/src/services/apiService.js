const API_BASE_URL = 'http://localhost:9999/api';
const AUTH_BASE_URL = 'http://localhost:9999/api';

// Helper function to get role-based API path
const getRoleBasedPath = (service) => {
  const userRole = localStorage.getItem('userRole') || 'USER';
  const rolePrefix = userRole === 'ADMIN' ? 'admin' : 'user';
  return `${API_BASE_URL}/auth/${rolePrefix}/${service}`;
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
    'X-User-Role': localStorage.getItem('userRole') || 'USER'
  };
};

const baseService = {
  getCategories: async () => {
    try {
      const response = await fetch(`${getRoleBasedPath('categories')}`, {
        headers: getAuthHeaders()
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  createCategory: async (category) => {
    try {
      const response = await fetch(`${getRoleBasedPath('categories')}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(category)
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  },

  getProducts: async () => {
    try {
      const response = await fetch(`${getRoleBasedPath('products')}`, {
        headers: getAuthHeaders()
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },

  getSubcategories: async () => {
    try {
      const response = await fetch(`${getRoleBasedPath('subcategories')}`, {
        headers: getAuthHeaders()
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      return [];
    }
  },

  createProduct: async (productData) => {
    try {
      const response = await fetch(`${getRoleBasedPath('products')}/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(productData)
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }
};

const authService = {
  register: async (userData) => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error registering:', error);
      return null;
    }
  },

  login: async (email, password) => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await response.json();
    } catch (error) {
      console.error('Error logging in:', error);
      return null;
    }
  },

  verifyOtp: async (email, otp) => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      return await response.json();
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return null;
    }
  },

  resendOtp: async (email) => {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return await response.json();
    } catch (error) {
      console.error('Error resending OTP:', error);
      return null;
    }
  }
};

export const categoriesApi = {
  getAll: async () => {
    try {
      const response = await fetch(`${getRoleBasedPath('categories')}`, {
        headers: getAuthHeaders()
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },
  create: async (name) => {
    try {
      const response = await fetch(`${getRoleBasedPath('categories')}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name })
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },
  update: async (id, name) => {
    try {
      const response = await fetch(`${getRoleBasedPath('categories')}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name })
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await fetch(`${getRoleBasedPath('categories')}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
};

export const subcategoriesApi = {
  getAll: async () => {
    try {
      const response = await fetch(`${getRoleBasedPath('subcategories')}`, {
        headers: getAuthHeaders()
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      return [];
    }
  },
  create: async (categoryId, name, imageUrl = '') => {
    try {
      const response = await fetch(`${getRoleBasedPath('subcategories')}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ categoryId, name, imageUrl })
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error creating subcategory:', error);
      throw error;
    }
  },
  update: async (id, categoryId, name, imageUrl = '') => {
    try {
      const response = await fetch(`${getRoleBasedPath('subcategories')}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ categoryId, name, imageUrl })
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error updating subcategory:', error);
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await fetch(`${getRoleBasedPath('subcategories')}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      throw error;
    }
  }
};

export const apiService = baseService;
export const productsApiService = {
  ...baseService,
  create: baseService.createProduct
};
export const authApi = authService;
