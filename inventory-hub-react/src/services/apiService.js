const API_BASE_URL = 'http://localhost:9999/api';
const AUTH_BASE_URL = 'http://localhost:2000/api';

const baseService = {
  getCategories: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  createCategory: async (category) => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${API_BASE_URL}/products`);
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  },

  getSubcategories: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/subcategories`);
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      return [];
    }
  },

  createProduct: async (productData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      return response.ok ? await response.text() : null;
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
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error logging in:', error);
      return null;
    }
  }
};

export const categoriesApi = {
  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },
  create: async (name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE'
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
      const response = await fetch(`${API_BASE_URL}/subcategories`);
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      return [];
    }
  },
  create: async (categoryId, name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, name })
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error creating subcategory:', error);
      throw error;
    }
  },
  update: async (id, categoryId, name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subcategories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, name })
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error updating subcategory:', error);
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subcategories/${id}`, {
        method: 'DELETE'
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
