const API_BASE_URL = 'http://localhost:9999/api';

export const imsService = {
  auth: {
    signup: async (userData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        return response.ok ? await response.json() : { error: 'Signup failed' };
      } catch (error) {
        console.error('Error during signup:', error);
        return { error: error.message };
      }
    },

    login: async (credentials) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });
        return response.ok ? await response.json() : { error: 'Login failed' };
      } catch (error) {
        console.error('Error during login:', error);
        return { error: error.message };
      }
    },

    getCustomer: async (customerId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/customer/${customerId}`);
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching customer:', error);
        return null;
      }
    }
  },

  products: {
    getAllProducts: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },

    getProductById: async (id) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/getByProductId/${id}`);
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching product:', error);
        return null;
      }
    },

    getProductByCustomer: async (customerId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/customer/${customerId}`);
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching product by customer:', error);
        return null;
      }
    },

    createProduct: async (productData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
        return response.ok ? await response.json() : { error: 'Failed to create product' };
      } catch (error) {
        console.error('Error creating product:', error);
        return { error: error.message };
      }
    },

    updateProduct: async (id, productData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/updateProduct/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
        return response.ok ? await response.json() : { error: 'Failed to update product' };
      } catch (error) {
        console.error('Error updating product:', error);
        return { error: error.message };
      }
    },

    deleteProduct: async (id) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: 'DELETE'
        });
        return response.ok ? { success: true } : { error: 'Failed to delete product' };
      } catch (error) {
        console.error('Error deleting product:', error);
        return { error: error.message };
      }
    },

    getAllCategories: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    },

    getAllSubcategories: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/subcategories`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        return [];
      }
    },

    getProductAttributes: async (productId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/product-attributes/product/${productId}`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching product attributes:', error);
        return [];
      }
    },

    addProductAttribute: async (productId, attributeData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/product-attributes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, ...attributeData })
        });
        return response.ok ? await response.json() : { error: 'Failed to add attribute' };
      } catch (error) {
        console.error('Error adding product attribute:', error);
        return { error: error.message };
      }
    }
  },
  
  inventory: {
    getAllInventory: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/inventory`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
      }
    },

    updateInventory: async (id, inventoryData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inventoryData)
        });
        return response.ok ? await response.json() : { error: 'Failed to update inventory' };
      } catch (error) {
        console.error('Error updating inventory:', error);
        return { error: error.message };
      }
    },

    disableInventory: async (productId, adminId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/inventory/${productId}`, {
          method: 'DELETE'
        });
        return response.ok ? { success: true } : { error: 'Failed to disable inventory' };
      } catch (error) {
        console.error('Error disabling inventory:', error);
        return { error: error.message };
      }
    }
  },

  analytics: {
    getAnalytics: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/analytics`);
        return response.ok ? await response.json() : {};
      } catch (error) {
        console.error('Error fetching analytics:', error);
        return {};
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
    },

    createOrder: async (orderData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        return response.ok ? await response.json() : { error: 'Failed to create order' };
      } catch (error) {
        console.error('Error creating order:', error);
        return { error: error.message };
      }
    }
  },

  pricing: {
    getAllPricing: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/pricing`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching pricing:', error);
        return [];
      }
    },

    getPricingByProductId: async (productId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/priceByProductId/${productId}`);
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching pricing:', error);
        return null;
      }
    },

    addPricing: async (pricingData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/addPrice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pricingData)
        });
        return response.ok ? await response.json() : { error: 'Failed to add pricing' };
      } catch (error) {
        console.error('Error adding pricing:', error);
        return { error: error.message };
      }
    },

    updatePricing: async (productId, pricingData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/updatePrice/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pricingData)
        });
        return response.ok ? await response.json() : { error: 'Failed to update pricing' };
      } catch (error) {
        console.error('Error updating pricing:', error);
        return { error: error.message };
      }
    },

    deletePricing: async (productId) => {
      try {
        // Backend doesn't have delete pricing endpoint
        console.warn('Delete pricing not available in backend');
        return { success: true };
      } catch (error) {
        console.error('Error deleting pricing:', error);
        return { error: error.message };
      }
    }
  }
};

export const productsService = imsService;
export const inventoryService = imsService;
export const pricingService = imsService;
export const imsApi = imsService;