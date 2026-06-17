const API_BASE_URL = 'http://localhost:9999/api';
const AUTH_BASE_URL = 'http://localhost:9999/api';

// Helper: admin session is stored in sessionStorage (tab-specific) so that a
// customer login in another tab cannot overwrite the admin token.
const isAdminSession = () => sessionStorage.getItem('isAdminSession') === 'true';

const getActiveToken = () => {
  if (isAdminSession()) {
    return sessionStorage.getItem('adminToken');
  }
  // Delivery boy token is in sessionStorage; customer token is in localStorage
  return sessionStorage.getItem('authToken')
    || sessionStorage.getItem('token')
    || localStorage.getItem('authToken')
    || localStorage.getItem('token');
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅ AUTO REFRESH FETCH WRAPPER
// fetch() replace karto - 401 aala tar automatically refresh token use karto
// ─────────────────────────────────────────────────────────────────────────────
let _isRefreshing = false;
let _refreshQueue = []; // pending requests during refresh

const _processQueue = (newToken, error) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(newToken);
  });
  _refreshQueue = [];
};

const _doTokenRefresh = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');

  // Route through API gateway for consistent CORS handling
  const REFRESH_URL = 'http://localhost:9999/api/auth/refresh';

  const res = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error('❌ Refresh response:', errBody);
    throw new Error('Refresh failed: ' + (errBody.error || res.status));
  }

  const data = await res.json();
  // New tokens save kara
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('token', data.token);
  console.log('🔄 Token auto-refreshed successfully!');
  return data.token;
};

/**
 * fetchWithAuth - fetch wrapper with automatic token refresh on 401
 * Usage: fetchWithAuth(url, options) - same as fetch()
 */
export const fetchWithAuth = async (url, options = {}) => {
  // Current token inject kara
  const token = getActiveToken();
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const response = await fetch(url, authOptions);

  // 401/403 nahi aala - normal response return kara
  if (response.status !== 401 && response.status !== 403) return response;

  // Admin session madhe refresh nako
  if (isAdminSession()) {
    sessionStorage.clear();
    window.location.href = '/admin/login';
    return response;
  }

  // refreshToken nahi tar logout karo - refresh possible nahi
  const storedRefreshToken = localStorage.getItem('refreshToken');
  if (!storedRefreshToken) {
    console.warn('⚠️ No refresh token available - session expired');
    window.dispatchEvent(new CustomEvent('sessionExpired'));
    return response;
  }

  // Already refreshing ahe - queue madhe add kara
  if (_isRefreshing) {
    return new Promise((resolve, reject) => {
      _refreshQueue.push({ resolve, reject });
    }).then(newToken => {
      const retryOptions = {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        }
      };
      return fetch(url, retryOptions);
    });
  }

  // Token refresh start kara
  _isRefreshing = true;

  try {
    const newToken = await _doTokenRefresh();
    _processQueue(newToken, null);

    // Original request retry kara new token saha
    const retryOptions = {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`
      }
    };
    return fetch(url, retryOptions);

  } catch (refreshError) {
    _processQueue(null, refreshError);
    console.error('❌ Token refresh failed - logging out');
    // Logout kara
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresIn');
    window.dispatchEvent(new CustomEvent('sessionExpired'));
    window.location.href = '/';
    return response;
  } finally {
    _isRefreshing = false;
  }
};

const getActiveRole = () => {
  if (isAdminSession()) return 'ADMIN';
  return localStorage.getItem('userRole') || localStorage.getItem('role') || 'USER';
};

// Helper function to get role-based API path
const getRoleBasedPath = (service) => {
  const userRole = getActiveRole();
  const rolePrefix = userRole === 'ADMIN' ? 'admin' : 'user';
  return `${API_BASE_URL}/auth/${rolePrefix}/${service}`;
};

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = getActiveToken();
  const role = getActiveRole();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    'X-User-Role': role
  };
};

// ✅ authFetch - getAuthHeaders + fetchWithAuth combined shortcut
const authFetch = (url, options = {}) => {
  const role = getActiveRole();
  return fetchWithAuth(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': role,
      ...options.headers
    }
  });
};

// Role change handler - call this when user role changes
export const updateUserRole = (newRole) => {
  if (isAdminSession()) {
    sessionStorage.setItem('adminRole', newRole);
  } else {
    localStorage.setItem('userRole', newRole);
  }
  console.log(`🔄 User role updated to: ${newRole}`);
  // Emit event for components to refresh
  window.dispatchEvent(new CustomEvent('roleChanged', { detail: { newRole } }));
};

export const imsService = {
  auth: {
    signup: async (userData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        const result = await response.json();
        if (response.ok && result.token) {
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('userRole', 'USER');
          localStorage.setItem('userId', result.userId);
        }
        return response.ok ? result : { error: 'Signup failed' };
      } catch (error) {
        console.error('Error during signup:', error);
        return { error: error.message };
      }
    },

    login: async (credentials) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });
        
        const result = await response.json();
        
        if (response.ok && result.token) {
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('userRole', result.isAdmin ? 'ADMIN' : result.isDeliveryBoy ? 'DELIVERY_BOY' : 'USER');
          localStorage.setItem('userId', result.customerId);
          localStorage.setItem('userName', `${result.firstName} ${result.lastName}`);
          if (result.isDeliveryBoy) localStorage.setItem('isDeliveryBoy', 'true');
          // ✅ NEW: Store refresh token
          if (result.refreshToken) {
            localStorage.setItem('refreshToken', result.refreshToken);
            localStorage.setItem('tokenExpiresIn', result.expiresIn);
          }
        }
        return response.ok ? result : { error: result.error || 'Login failed' };
      } catch (error) {
        console.error('Error during login:', error);
        return { error: error.message };
      }
    },

    // ✅ NEW: Refresh access token using refresh token
    refreshToken: async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return null;

        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (response.ok) {
          const result = await response.json();
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('token', result.token);
          return result.token;
        } else {
          // Refresh token expired - force logout
          imsService.auth.logout();
          return null;
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
      }
    },

    logout: async () => {
      try {
        const token = getActiveToken();
        const refreshToken = localStorage.getItem('refreshToken');
        // ✅ NEW: Revoke refresh token on server
        if (token && refreshToken) {
          await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ refreshToken })
          });
        }
      } catch (e) {
        // Ignore errors during logout
      } finally {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresIn');
      }
    },

    // ✅ NEW: Logout from all devices
    logoutAll: async () => {
      try {
        const token = getActiveToken();
        if (token) {
          await fetch(`${API_BASE_URL}/auth/logout-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
      } catch (e) { /* ignore */ } finally {
        localStorage.clear();
      }
    },

    // ✅ NEW: Get active sessions
    getActiveSessions: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/active-sessions`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching active sessions:', error);
        return [];
      }
    },

    // ✅ NEW: Get login history
    getLoginHistory: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/login-history`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching login history:', error);
        return [];
      }
    },

    // ✅ NEW: Check specific permission
    checkPermission: async (permissionName) => {
      try {
        const response = await authFetch(
          `${API_BASE_URL}/auth/permissions/check?permissionName=${permissionName}`
        );
        if (response.ok) {
          const data = await response.json();
          return data.hasPermission === true;
        }
        return false;
      } catch (error) {
        return false;
      }
    },

    // ✅ NEW: Get permissions for current role
    getMyPermissions: async () => {
      try {
        const role = getActiveRole();
        const response = await authFetch(
          `${API_BASE_URL}/auth/permissions/role/${role}`
        );
        return response.ok ? await response.json() : { permissions: [] };
      } catch (error) {
        return { permissions: [] };
      }
    },

    // ✅ NEW: Admin - get all permissions
    getAllPermissions: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/permissions`);
        return response.ok ? await response.json() : [];
      } catch (error) {
        return [];
      }
    },

    // ✅ NEW: Admin - assign permission to role
    assignPermission: async (role, permissionId) => {
      try {
        const response = await authFetch(
          `${API_BASE_URL}/auth/permissions/assign?role=${role}&permissionId=${permissionId}`,
          { method: 'POST' }
        );
        return response.ok ? await response.json() : { error: 'Failed to assign permission' };
      } catch (error) {
        return { error: error.message };
      }
    },

    // ✅ NEW: Admin - remove permission from role
    removePermission: async (role, permissionId) => {
      try {
        const response = await authFetch(
          `${API_BASE_URL}/auth/permissions/remove?role=${role}&permissionId=${permissionId}`,
          { method: 'DELETE' }
        );
        return response.ok ? await response.json() : { error: 'Failed to remove permission' };
      } catch (error) {
        return { error: error.message };
      }
    },

    // ✅ NEW: Admin - get login stats
    getLoginStats: async (days = 30) => {
      try {
        const response = await authFetch(
          `${API_BASE_URL}/auth/admin/login-stats?days=${days}`
        );
        return response.ok ? await response.json() : {};
      } catch (error) {
        return {};
      }
    },

    // ✅ NEW: Admin - get customer login history
    getCustomerLoginHistory: async (customerId) => {
      try {
        const response = await authFetch(
          `${API_BASE_URL}/auth/admin/login-history/${customerId}`
        );
        return response.ok ? await response.json() : [];
      } catch (error) {
        return [];
      }
    },

    getCurrentRole: () => {
      return getActiveRole();
    },

    isAdmin: () => {
      return getActiveRole() === 'ADMIN';
    },

    promoteToAdmin: async (userId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/promote?customerId=${userId}`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        const result = await response.json();
        
        if (response.ok) {
          // If the promoted user is the currently logged-in user, update their role
          const loggedInId = localStorage.getItem('userId') || localStorage.getItem('customerId');
          if (String(userId) === String(loggedInId)) {
            updateUserRole('ADMIN');
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('currentView', 'admin');
          }
        }
        
        return response.ok ? result : { error: result.message || 'Failed to promote user' };
      } catch (error) {
        console.error('Error promoting user:', error);
        return { error: error.message };
      }
    },

    getCustomer: async (customerId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/customer/${customerId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching customer:', error);
        return null;
      }
    },

    getAllCustomers: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/customers`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    },

    getCustomerIds: async () => {
      try {
        const customers = await imsService.auth.getAllCustomers();
        return customers.map(customer => ({ 
          id: customer.id, 
          name: `${customer.firstName} ${customer.lastName}` 
        }));
      } catch (error) {
        console.error('Error fetching customer IDs:', error);
        return [];
      }
    }
  },

  products: {
    getAllProducts: async () => {
      try {
        // Use the role-appropriate path directly — avoid hitting admin path with USER token (403)
        const rolePrefix = getActiveRole() === 'ADMIN' ? 'admin' : 'user';
        const path = `${API_BASE_URL}/auth/${rolePrefix}/products`;
        const res = await fetch(path, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },

    // Search products by name for autocomplete suggestions — calls backend /search endpoint
    searchProducts: async (query) => {
      if (!query || query.trim().length < 2) return [];
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/admin/products/search?q=${encodeURIComponent(query.trim())}`,
          { headers: getAuthHeaders() }
        );
        if (!response.ok) return [];
        const products = await response.json();
        return products.map(p => ({
          name: p.name,
          category: p.categoryName || '',
          productUrl: p.productUrl || ''
        }));
      } catch (error) {
        console.error('Error searching products:', error);
        return [];
      }
    },

    getProductById: async (id) => {
      try {
        const response = await fetch(`${getRoleBasedPath('products')}/getByProductId/${id}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching product:', error);
        return null;
      }
    },

    getProductByCustomer: async (customerId) => {
      try {
        const response = await fetch(`${getRoleBasedPath('products')}/customer/${customerId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching product by customer:', error);
        return null;
      }
    },

    createProduct: async (productData) => {
      try {
        const response = await fetch(`${getRoleBasedPath('products')}/add`, {
          method: 'POST',
          headers: getAuthHeaders(),
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
        const response = await fetch(`${getRoleBasedPath('products')}/updateProduct/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
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
        const response = await fetch(`${getRoleBasedPath('products')}/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        return response.ok ? { success: true } : { error: 'Failed to delete product' };
      } catch (error) {
        console.error('Error deleting product:', error);
        return { error: error.message };
      }
    },

    getAllCategories: async () => {
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

    // Returns { categoryId: gstRate } from backend — real-time, no hardcoding
    getCategoryGstRates: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories/gst`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : {};
      } catch (error) {
        console.error('Error fetching category GST rates:', error);
        return {};
      }
    },

    getAllSubcategories: async () => {
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

    getSubcategoriesByCategory: async (categoryId) => {
      try {
        const response = await fetch(`${getRoleBasedPath('subcategories')}/category/${categoryId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching subcategories by category:', error);
        return [];
      }
    },

    getProductAttributes: async (productId) => {
      try {
        // Try direct route first (works after gateway restart), fallback to auth-prefixed
        const urls = [
          `http://localhost:9999/api/product-attributes/product/${productId}`,
          `${getRoleBasedPath('product-attributes')}/product/${productId}`
        ];
        for (const url of urls) {
          try {
            const response = await fetch(url, { headers: getAuthHeaders() });
            if (response.ok) return await response.json();
          } catch (_) {}
        }
        return [];
      } catch (error) {
        console.error('Error fetching product attributes:', error);
        return [];
      }
    },

    addProductAttribute: async (productId, attributeData) => {
      try {
        const urls = [
          `http://localhost:9999/api/product-attributes`,
          `${getRoleBasedPath('product-attributes')}`
        ];
        for (const url of urls) {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ productId, name: attributeData.attributeName, value: attributeData.attributeValue })
            });
            if (response.ok) return await response.json();
          } catch (_) {}
        }
        return { error: 'Failed to add product attribute' };
      } catch (error) {
        console.error('Error adding product attribute:', error);
        return { error: error.message };
      }
    },

    saveAttributesBulk: async (productId, attributesMap) => {
      try {
        const urls = [
          `http://localhost:9999/api/product-attributes/bulk/${productId}`,
          `${getRoleBasedPath('product-attributes')}/bulk/${productId}`
        ];
        for (const url of urls) {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(attributesMap)
            });
            if (response.ok) return await response.json();
          } catch (_) {}
        }
        return { error: 'Failed to save attributes' };
      } catch (error) {
        console.error('Error saving bulk attributes:', error);
        return { error: error.message };
      }
    },

    getCategoryAttributes: async (categoryId) => {
      try {
        const response = await fetch(`http://localhost:9999/api/categories/${categoryId}/attributes`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching category attributes:', error);
        return [];
      }
    },

    createCategoryAttributes: async (categoryId, attributeNames) => {
      try {
        const response = await fetch(`http://localhost:9999/api/categories/${categoryId}/attributes/bulk`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(attributeNames)
        });
        return response.ok ? await response.json() : { error: 'Failed to create category attributes' };
      } catch (error) {
        console.error('Error creating category attributes:', error);
        return { error: error.message };
      }
    },

    /**
     * Related Products: same subcategory, ACTIVE, excludes current product.
     * Calls: GET /api/products/{productId}/related?subcategoryId=X&limit=8
     */
    getRelatedProducts: async (productId, subcategoryId, limit = 8) => {
      try {
        const url = `${API_BASE_URL}/products/${productId}/related?subcategoryId=${subcategoryId}&limit=${limit}`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching related products:', error);
        return [];
      }
    },

    /**
     * Relevant Products: complementary products (subcategory map + product attribute tags).
     * Calls: GET /api/products/{productId}/relevant?categoryId=X&subcategoryId=Y&limit=8
     */
    getRelevantProducts: async (productId, categoryId, subcategoryId, limit = 8) => {
      try {
        const url = `${API_BASE_URL}/products/${productId}/relevant?categoryId=${categoryId}&subcategoryId=${subcategoryId}&limit=${limit}`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching relevant products:', error);
        return [];
      }
    },

    // ── Complementary Map CRUD (Admin) ────────────────────────────────────────

    /** GET all complementary mappings, or for a specific subcategoryId */
    getComplementaryMappings: async (subcategoryId = null) => {
      try {
        const url = subcategoryId
          ? `${API_BASE_URL}/products/complementary-map?subcategoryId=${subcategoryId}`
          : `${API_BASE_URL}/products/complementary-map`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching complementary mappings:', error);
        return [];
      }
    },

    /** POST add a new complementary mapping */
    addComplementaryMapping: async (subcategoryId, complementarySubcategoryId, label = '') => {
      try {
        const response = await fetch(`${API_BASE_URL}/products/complementary-map`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ subcategoryId, complementarySubcategoryId, label })
        });
        return response.ok ? await response.json() : { error: 'Failed to add mapping' };
      } catch (error) {
        console.error('Error adding complementary mapping:', error);
        return { error: error.message };
      }
    },

    /** DELETE remove a complementary mapping */
    removeComplementaryMapping: async (subcategoryId, complementarySubcategoryId) => {
      try {
        const url = `${API_BASE_URL}/products/complementary-map?subcategoryId=${subcategoryId}&complementarySubcategoryId=${complementarySubcategoryId}`;
        const response = await fetch(url, { method: 'DELETE', headers: getAuthHeaders() });
        return response.ok ? { success: true } : { error: 'Failed to remove mapping' };
      } catch (error) {
        console.error('Error removing complementary mapping:', error);
        return { error: error.message };
      }
    }
  },

  pricing: {
    getAllPricing: async () => {
      try {
        // Use role-appropriate path — never call admin path with a USER token (causes 403)
        const rolePrefix = getActiveRole() === 'ADMIN' ? 'admin' : 'user';
        const pricingPath  = `${API_BASE_URL}/auth/${rolePrefix}/products/pricing`;
        const productsPath = `${API_BASE_URL}/auth/${rolePrefix}/products`;

        let pricingRes  = await fetch(pricingPath,  { headers: getAuthHeaders() });
        let productsRes = await fetch(productsPath, { headers: getAuthHeaders() });

        const pricingList  = pricingRes.ok  ? await pricingRes.json()  : [];
        const productsList = productsRes.ok ? await productsRes.json() : [];

        // Build a quick lookup map: productId -> product
        const productMap = {};
        (Array.isArray(productsList) ? productsList : []).forEach(p => {
          productMap[p.productId] = p;
        });

        // Merge product info + ensure discount is always calculated from MRP vs SP
        // Never trust stored discount=0 if MRP > sellingPrice — always recalculate
        return (Array.isArray(pricingList) ? pricingList : []).map(pricing => {
          const product = productMap[pricing.productId] || null;
          const mrp = parseFloat(pricing.mrp) || 0;
          const sp  = parseFloat(pricing.sellingPrice) || 0;
          // Always recalculate discount from MRP vs sellingPrice
          // Stored discount is only used as fallback when MRP is 0
          const calculatedDiscount = mrp > 0 && sp > 0
            ? parseFloat(((mrp - sp) / mrp * 100).toFixed(2))
            : (pricing.discount != null ? parseFloat(pricing.discount) : 0);
          const discount = calculatedDiscount < 0 ? 0 : calculatedDiscount; // never negative
          return {
            ...pricing,
            discount,
            discountAmount: parseFloat((mrp - sp).toFixed(2)),
            productName: product ? product.name : null,
            productBarcode: product ? product.productBarcode : null,
            categoryId: product ? product.categoryId : null
          };
        });
      } catch (error) {
        console.error('Error fetching pricing:', error);
        return [];
      }
    },

    getPricingByProductId: async (productId) => {
      try {
        const adminPath = `${API_BASE_URL}/auth/admin/products/priceByProductId/${productId}`;
        const response = await fetch(adminPath, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching pricing by product ID:', error);
        return null;
      }
    },

    addPricing: async (pricingData) => {
      const adminPath = `${API_BASE_URL}/auth/admin/products/addPrice`;
      const response = await fetch(adminPath, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(pricingData)
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => 'Failed to add pricing');
        throw new Error(errText || `HTTP ${response.status}`);
      }
      return response.json();
    },

    updatePricing: async (productId, pricingData) => {
      const adminPath = `${API_BASE_URL}/auth/admin/products/updatePrice/${productId}`;
      const response = await fetch(adminPath, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(pricingData)
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => 'Failed to update pricing');
        throw new Error(errText || `HTTP ${response.status}`);
      }
      return response.json();
    },

    deletePricing: async (pricingId) => {
      const adminPath = `${API_BASE_URL}/auth/admin/products/pricing/${pricingId}`;
      const response = await fetch(adminPath, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => 'Failed to delete pricing');
        throw new Error(errText || `HTTP ${response.status}`);
      }
      // DELETE may return 204 No Content
      const text = await response.text();
      return text ? JSON.parse(text) : { success: true };
    }
  },
  
  inventory: {
    getAllInventory: async () => {
      try {
        const adminPath = `${API_BASE_URL}/auth/admin/inventory`;
        const response = await fetch(adminPath, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
      }
    },

    getAvailableStock: async () => {
      try {
        const adminPath = `${API_BASE_URL}/auth/admin/inventory`;
        const response = await fetch(adminPath, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching available stock:', error);
        return [];
      }
    },

    getInventoryByBarcode: async (barcode) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/barcode/${encodeURIComponent(barcode)}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching inventory by barcode:', error);
        return null;
      }
    },

    getInventoryByProductId: async (productId) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/product/${productId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching inventory by product ID:', error);
        return [];
      }
    },

    createInventory: async (inventoryData) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/add`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(inventoryData)
        });
        const result = await response.json();
        return response.ok ? result : { error: result.message || 'Failed to create inventory' };
      } catch (error) {
        console.error('Error creating inventory:', error);
        return { error: error.message };
      }
    },

    updateInventory: async (barcode, inventoryData) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/${encodeURIComponent(barcode)}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(inventoryData)
        });
        const result = await response.json();
        return response.ok ? result : { error: result.message || 'Failed to update inventory' };
      } catch (error) {
        console.error('Error updating inventory:', error);
        return { error: error.message };
      }
    },

    updatePrice: async (barcode, priceData) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/${encodeURIComponent(barcode)}/price`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(priceData)
        });
        return response.ok ? await response.json() : { error: 'Failed to update price' };
      } catch (error) {
        console.error('Error updating price:', error);
        return { error: error.message };
      }
    },

    disableInventory: async (barcode, adminId) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/${encodeURIComponent(barcode)}/disable?adminId=${adminId}`, {
          method: 'PATCH',
          headers: getAuthHeaders()
        });
        const result = await response.json();
        return response.ok ? result : { error: result.message || 'Failed to disable inventory' };
      } catch (error) {
        console.error('Error disabling inventory:', error);
        return { error: error.message };
      }
    },

    deleteInventory: async (barcode) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/${encodeURIComponent(barcode)}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const result = await response.json();
        return response.ok ? result : { error: result.message || 'Failed to delete inventory' };
      } catch (error) {
        console.error('Error deleting inventory:', error);
        return { error: error.message };
      }
    },

    checkProductAvailability: async (productId, quantity = 1) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/stock/check?productId=${productId}&quantity=${quantity}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : false;
      } catch (error) {
        console.error('Error checking product availability:', error);
        return false;
      }
    },

    getProductAvailability: async (productId) => {
      try {
        // Use direct route - no auth needed per gateway config
        const response = await fetch(`${API_BASE_URL}/inventory/stock/availability?productId=${productId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error getting product availability:', error);
        return null;
      }
    },

    stockByProduct: async (productId) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/stock/product-count?productId=${productId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : 0;
      } catch (error) {
        console.error('Error getting stock by product:', error);
        return 0;
      }
    },

    stockByCategory: async (categoryId) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/stock/category-count?categoryId=${categoryId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : 0;
      } catch (error) {
        console.error('Error getting stock by category:', error);
        return 0;
      }
    },

    getProductPricing: async (productId) => {
      try {
        const response = await fetch(`${getRoleBasedPath('inventory')}/pricing/${productId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error getting product pricing:', error);
        return null;
      }
    },

    testConnection: async () => {
      try {
        const adminPath = `${API_BASE_URL}/auth/admin/inventory/test`;
        const response = await fetch(adminPath, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : { error: 'Connection test failed' };
      } catch (error) {
        console.error('Error testing inventory connection:', error);
        return { error: error.message };
      }
    },

    // Analytics: daily sales/returns/damage from inventory-service
    getDailySales: async (type = 'SALE') => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/admin/inventory/analytics/sales/daily?type=${type}`,
          { headers: getAuthHeaders() }
        );
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching daily sales analytics:', error);
        return [];
      }
    },

    // Analytics: sales between date range
    getSalesByDateRange: async (type = 'SALE', from, to) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/admin/inventory/analytics/sales/from-to?type=${type}&from=${from}&to=${to}`,
          { headers: getAuthHeaders() }
        );
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching sales by date range:', error);
        return [];
      }
    }
  },

  orders: {
    getAllOrders: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/orders/all`);
        return response.ok ? await response.json() : [];
      } catch (error) { console.error('Error fetching orders:', error); return []; }
    },

    getOrderById: async (orderId) => {
      try {
        const response = await authFetch(`${getRoleBasedPath('orders')}/${orderId}`);
        return response.ok ? await response.json() : null;
      } catch (error) { console.error('Error fetching order:', error); return null; }
    },

    getUserOrders: async (userId) => {
      try {
        const response = await authFetch(`${getRoleBasedPath('orders')}/user/${userId}`);
        return response.ok ? await response.json() : [];
      } catch (error) { console.error('Error fetching user orders:', error); return []; }
    },

    createOrder: async (orderData) => {
      try {
        const response = await fetch(`${getRoleBasedPath('orders')}`, {
          method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(orderData)
        });
        return response.ok ? await response.json() : { error: 'Failed to create order' };
      } catch (error) { return { error: error.message }; }
    },

    updateOrderStatus: async (orderNumber, status) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/admin/orders/${orderNumber}/status?status=${status}`,
          { method: 'PATCH', headers: getAuthHeaders() }
        );
        return response.ok ? await response.json() : { error: 'Failed to update order status' };
      } catch (error) { return { error: error.message }; }
    },

    // User-facing cancel — uses /auth/user/orders path so regular customers can cancel
    cancelOrder: async (orderNumber) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/user/orders/${orderNumber}/status?status=CANCELLED`,
          { method: 'PATCH', headers: getAuthHeaders() }
        );
        return response.ok ? await response.json() : { error: 'Failed to cancel order' };
      } catch (error) { return { error: error.message }; }
    },

    // Trigger refund after cancellation — called automatically after cancelOrder succeeds
    cancelRefund: async (orderNumber, reason = '') => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/user/orders/${orderNumber}/cancel-refund?reason=${encodeURIComponent(reason)}`,
          { method: 'POST', headers: getAuthHeaders() }
        );
        return response.ok ? await response.json() : { error: 'Refund initiation failed' };
      } catch (error) { return { error: error.message }; }
    },

    // Order Items
    getAllOrderItems: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/orders/all`, { headers: getAuthHeaders() });
        if (!response.ok) return [];
        const orders = await response.json();
        return orders.flatMap(o => (o.items || []).map(item => ({ ...item, orderNumber: o.orderNumber })));
      } catch (error) { console.error('Error fetching order items:', error); return []; }
    },

    // Order Status History
    getAllStatusHistory: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/orders/statusHistory`, { headers: getAuthHeaders() });
        return response.ok ? await response.json() : [];
      } catch (error) { console.error('Error fetching status history:', error); return []; }
    },

    // Pricing (orderdb)
    getAllOrderPricing: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/orders/pricing`, { headers: getAuthHeaders() });
        return response.ok ? await response.json() : [];
      } catch (error) { console.error('Error fetching order pricing:', error); return []; }
    },

    // Customer Details
    getAllCustomerDetails: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/orders/customerDetails`, { headers: getAuthHeaders() });
        return response.ok ? await response.json() : [];
      } catch (error) { console.error('Error fetching customer details:', error); return []; }
    },

    // Returns
    getAllReturns: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/orders/returns`, { headers: getAuthHeaders() });
        return response.ok ? await response.json() : [];
      } catch (error) { console.error('Error fetching returns:', error); return []; }
    },

    // Refunds
    getAllRefunds: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/admin/orders/refunds`, { headers: getAuthHeaders() });
        return response.ok ? await response.json() : [];
      } catch (error) { console.error('Error fetching refunds:', error); return []; }
    },

    // ── Return Flow (3-step) ──────────────────────────────────────────────────

    // Step 1: Initiate return request
    initiateReturn: async (returnData) => {
      try {
        // Backend expects LocalDateTime format: "2026-02-08T00:13:55" (no Z, no ms)
        const now = new Date();
        const localDT = now.getFullYear() + '-' +
          String(now.getMonth()+1).padStart(2,'0') + '-' +
          String(now.getDate()).padStart(2,'0') + 'T' +
          String(now.getHours()).padStart(2,'0') + ':' +
          String(now.getMinutes()).padStart(2,'0') + ':' +
          String(now.getSeconds()).padStart(2,'0');

        const payload = {
          ...returnData,
          returnInitiatedAt: localDT,
        };

        const response = await fetch(`${API_BASE_URL}/orders/order-return-initiated-step1`, {
          method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { error: err.message || `HTTP ${response.status}`, status: response.status, ...err };
        }
        return await response.json();
      } catch (error) { return { error: error.message }; }
    },

    // Step 2: Physical verification (delivery boy / admin)
    physicalVerification: async (verificationData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/order-return-initiate-physical-verification-step2`, {
          method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(verificationData)
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { error: err.message || `HTTP ${response.status}`, status: response.status, ...err };
        }
        return await response.json();
      } catch (error) { return { error: error.message }; }
    },

    // Step 3: Final return completion
    finalReturn: async (returnData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/order-return-finalStep3`, {
          method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(returnData)
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { error: err.message || `HTTP ${response.status}`, status: response.status, ...err };
        }
        return await response.json();
      } catch (error) { return { error: error.message }; }
    },

    // ── Refund ────────────────────────────────────────────────────────────────
    doRefund: async (refundData) => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/doRefund`, {
          method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(refundData)
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { error: err.message || `HTTP ${response.status}`, status: response.status, ...err };
        }
        return await response.json();
      } catch (error) { return { error: error.message }; }
    },

    // Get return status for a specific order+barcode
    getReturnStatus: async (orderNumber, barcode) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/orders/return-status?orderNumber=${encodeURIComponent(orderNumber)}&barcode=${encodeURIComponent(barcode)}`,
          { headers: getAuthHeaders() }
        );
        if (!response.ok) return null; // silently ignore 404/500 - no return exists yet
        const data = await response.json();
        // Return null if no status (empty response)
        return data?.returnStatus ? data : null;
      } catch (error) { return null; }
    },

    // Order Outbox
    getFailedOutboxEvents: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/failedEvents`, { headers: getAuthHeaders() });
        return response.ok ? await response.json() : [];
      } catch (error) { console.error('Error fetching outbox events:', error); return []; }
    },

    resendFailedEvents: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/resendFailedEvents`, {
          method: 'POST', headers: getAuthHeaders()
        });
        return response.ok ? await response.text() : { error: 'Failed to resend' };
      } catch (error) { return { error: error.message }; }
    }
  },

  // ── Supplier Contacts ────────────────────────────────────────────────────
  suppliers: {
    getAll: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/suppliers`, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : [];
      } catch (e) { console.error('Error fetching suppliers:', e); return []; }
    },
    getById: async (id) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/suppliers/${id}`, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : null;
      } catch (e) { return null; }
    },
    create: async (data) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/suppliers`, {
          method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        return res.ok ? await res.json() : { error: 'Failed to create supplier' };
      } catch (e) { return { error: e.message }; }
    },
    update: async (id, data) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/suppliers/${id}`, {
          method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data)
        });
        return res.ok ? await res.json() : { error: 'Failed to update supplier' };
      } catch (e) { return { error: e.message }; }
    },
    delete: async (id) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/suppliers/${id}`, {
          method: 'DELETE', headers: getAuthHeaders()
        });
        return res.ok ? { success: true } : { error: 'Failed to delete supplier' };
      } catch (e) { return { error: e.message }; }
    },
    updateStatus: async (id, status) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/suppliers/${id}/status?status=${status}`, {
          method: 'PATCH', headers: getAuthHeaders()
        });
        return res.ok ? await res.json() : { error: 'Failed to update status' };
      } catch (e) { return { error: e.message }; }
    },
    search: async (query) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/suppliers/search?q=${encodeURIComponent(query)}`, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : [];
      } catch (e) { return []; }
    },
    getStats: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/suppliers/stats`, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : {};
      } catch (e) { return {}; }
    }
  },

  // ── Reports (first block removed — merged into the reports block below) ──

  deliveryBoy: {
    getMyOrders: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/delivery/my-orders`, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : [];
      } catch (e) { return []; }
    },
    markPickup: async (orderNumber) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/delivery/${orderNumber}/pickup`, { method: 'PATCH', headers: getAuthHeaders() });
        return res.ok ? await res.json() : { error: 'Failed' };
      } catch (e) { return { error: e.message }; }
    },
    markDelivered: async (orderNumber) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/delivery/${orderNumber}/delivered`, { method: 'PATCH', headers: getAuthHeaders() });
        return res.ok ? await res.json() : { error: 'Failed' };
      } catch (e) { return { error: e.message }; }
    },
    addDeliveryBoy: async (customerId) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/delivery-boy/add?customerId=${customerId}`, { method: 'POST', headers: getAuthHeaders() });
        return res.ok ? await res.json() : { error: 'Failed' };
      } catch (e) { return { error: e.message }; }
    },
    removeDeliveryBoy: async (customerId) => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/delivery-boy/remove?customerId=${customerId}`, { method: 'DELETE', headers: getAuthHeaders() });
        return res.ok ? await res.json() : { error: 'Failed' };
      } catch (e) { return { error: e.message }; }
    },
    getAllDeliveryBoys: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/delivery-boys`, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : [];
      } catch (e) { return []; }
    },

    // ── Return Pickup Flow ────────────────────────────────────────────────────

    // Fetch pending return pickup tasks assigned to THIS delivery boy
    // Backend: GET /api/auth/delivery/return-pickup-tasks?deliveryBoyId=X
    getPendingReturnRequests: async (deliveryBoyId) => {
      try {
        if (!deliveryBoyId) {
          console.warn('getPendingReturnRequests: deliveryBoyId is required');
          return [];
        }
        const res = await fetch(
          `${API_BASE_URL}/auth/delivery/return-pickup-tasks?deliveryBoyId=${deliveryBoyId}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) {
          console.error('Failed to fetch return pickup tasks:', res.status);
          return [];
        }
        return await res.json();
      } catch (e) {
        console.error('Error fetching return pickup tasks:', e);
        return [];
      }
    },

    // Confirm return item collected from customer
    // Backend: PATCH /api/auth/delivery/return-pickup/{assignmentId}/collected
    confirmReturnPickupCollected: async (assignmentId, remarks = '') => {
      try {
        const url = `${API_BASE_URL}/auth/delivery/return-pickup/${assignmentId}/collected${remarks ? `?remarks=${encodeURIComponent(remarks)}` : ''}`;
        const res = await fetch(url, { method: 'PATCH', headers: getAuthHeaders() });
        return res.ok ? await res.json() : { error: 'Failed to confirm return pickup' };
      } catch (e) { return { error: e.message }; }
    },

    // Fetch pending cash refund tasks for this delivery boy
    // Backend: GET /api/auth/delivery/cash-refund-tasks?deliveryBoyId=X
    getCashRefundTasks: async (deliveryBoyId) => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/auth/delivery/cash-refund-tasks?deliveryBoyId=${deliveryBoyId}`,
          { headers: getAuthHeaders() }
        );
        return res.ok ? await res.json() : [];
      } catch (e) { return []; }
    },

    // Confirm cash handed back to customer
    // Backend: PATCH /api/auth/delivery/cash-refund/{assignmentId}/done
    confirmCashRefundDone: async (assignmentId, remarks = '') => {
      try {
        const url = `${API_BASE_URL}/auth/delivery/cash-refund/${assignmentId}/done${remarks ? `?remarks=${encodeURIComponent(remarks)}` : ''}`;
        const res = await fetch(url, { method: 'PATCH', headers: getAuthHeaders() });
        return res.ok ? await res.json() : { error: 'Failed to confirm cash refund' };
      } catch (e) { return { error: e.message }; }
    },

    // Admin: get all cash refund tasks (pending + done)
    // Backend: GET /api/auth/admin/delivery/cash-refund-tasks
    getAllCashRefundTasks: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/delivery/cash-refund-tasks`, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : [];
      } catch (e) { return []; }
    },

    // Step 2: Delivery boy physically verifies and approves/rejects the return
    // Backend: POST /api/orders/order-return-initiate-physical-verification-step2
    verifyReturnPickup: async ({ orderNumber, barcode, approved, rejectionReason = null, inspectorRemarks = null, itemCondition = null, inspectionImages = null }) => {
      try {
        const payload = {
          orderNumber,
          barcode,
          approved,
          ...(rejectionReason   && { rejectionReason }),
          ...(inspectorRemarks  && { inspectorRemarks }),
          ...(itemCondition     && { itemCondition }),
          ...(inspectionImages  && inspectionImages.length > 0 && { inspectionImages }),
        };
        const res = await fetch(
          `${API_BASE_URL}/orders/order-return-initiate-physical-verification-step2`,
          { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { error: err.message || `HTTP ${res.status}` };
        }
        return await res.json();
      } catch (e) { return { error: e.message }; }
    },
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  reports: {
    /** Summary (positional args — kept for backward compatibility with ReportsModern) */
    getSummary: async (from, to) => {
      try {
        let url = `${API_BASE_URL}/auth/admin/reports/summary`;
        if (from && to) url += `?from=${from}&to=${to}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : null;
      } catch (e) { console.error('Error fetching report summary:', e); return null; }
    },

    getPackages: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/admin/reports/packages`, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : null;
      } catch (e) { console.error('Error fetching package report:', e); return null; }
    },

    getRevenue: async (from, to) => {
      try {
        let url = `${API_BASE_URL}/auth/admin/reports/revenue`;
        if (from && to) url += `?from=${from}&to=${to}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        return res.ok ? await res.json() : null;
      } catch (e) { console.error('Error fetching revenue report:', e); return null; }
    },

    /**
     * Top Selling Products
     * @param {string} period  - 'monthly' | 'yearly'
     * @param {number} year    - optional, defaults to current year
     * @param {number} month   - optional (monthly only), defaults to current month
     * @param {number} limit   - how many top products (default 10)
     */
    getTopProducts: async ({ period = 'monthly', year, month, limit = 10 } = {}) => {
      try {
        const params = new URLSearchParams({ period, limit });
        if (year)  params.append('year',  year);
        if (month) params.append('month', month);
        const res = await fetch(
          `${API_BASE_URL}/auth/admin/reports/top-products?${params}`,
          { headers: getAuthHeaders() }
        );
        return res.ok ? await res.json() : { topProducts: [], monthlyTrend: {} };
      } catch (e) {
        console.error('Error fetching top products:', e);
        return { topProducts: [], monthlyTrend: {} };
      }
    },

    getSummaryReport: async ({ from, to } = {}) => {
      try {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to)   params.append('to',   to);
        const res = await fetch(
          `${API_BASE_URL}/auth/admin/reports/summary?${params}`,
          { headers: getAuthHeaders() }
        );
        return res.ok ? await res.json() : null;
      } catch (e) { return null; }
    },

    getRevenueReport: async ({ from, to } = {}) => {
      try {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to)   params.append('to',   to);
        const res = await fetch(
          `${API_BASE_URL}/auth/admin/reports/revenue?${params}`,
          { headers: getAuthHeaders() }
        );
        return res.ok ? await res.json() : null;
      } catch (e) { return null; }
    },
  },

  // ─── Purchase Orders Service ───────────────────────────────────────────────
  purchaseOrders: {
    getAll: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/purchase-orders`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        return [];
      }
    },

    getById: async (poId) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/purchase-orders/${poId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching purchase order:', error);
        return null;
      }
    },

    create: async (orderData) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/purchase-orders`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(orderData)
        });
        if (response.ok) return await response.json();
        // Show actual backend error message
        const errBody = await response.json().catch(() => ({}));
        return { error: errBody.message || errBody.error || `HTTP ${response.status}` };
      } catch (error) {
        console.error('Error creating purchase order:', error);
        return { error: error.message };
      }
    },

    update: async (poId, orderData) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/purchase-orders/${poId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(orderData)
        });
        return response.ok ? await response.json() : { error: 'Failed to update purchase order' };
      } catch (error) {
        console.error('Error updating purchase order:', error);
        return { error: error.message };
      }
    },

    delete: async (poId) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/purchase-orders/${poId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        return response.ok ? { success: true, message: 'Purchase order deleted' } : { error: 'Failed to delete' };
      } catch (error) {
        console.error('Error deleting purchase order:', error);
        return { error: error.message };
      }
    },

    getStats: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/purchase-orders/stats`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : {};
      } catch (error) {
        console.error('Error fetching purchase order stats:', error);
        return {};
      }
    },

    approve: async (poId) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/purchase-orders/${poId}/approve`, {
          method: 'PUT',
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : { error: 'Failed to approve purchase order' };
      } catch (error) {
        console.error('Error approving purchase order:', error);
        return { error: error.message };
      }
    },

    cancel: async (poId) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/purchase-orders/${poId}/cancel`, {
          method: 'PUT',
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : { error: 'Failed to cancel purchase order' };
      } catch (error) {
        console.error('Error cancelling purchase order:', error);
        return { error: error.message };
      }
    }
  },

  // ─── Suppliers Service ─────────────────────────────────────────────────────
  suppliers: {
    getAll: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/suppliers`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : [];
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        return [];
      }
    },

    getById: async (supplierId) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/suppliers/${supplierId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching supplier:', error);
        return null;
      }
    },

    create: async (supplierData) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/suppliers`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(supplierData)
        });
        return response.ok ? await response.json() : { error: 'Failed to create supplier' };
      } catch (error) {
        console.error('Error creating supplier:', error);
        return { error: error.message };
      }
    },

    update: async (supplierId, supplierData) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/suppliers/${supplierId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(supplierData)
        });
        return response.ok ? await response.json() : { error: 'Failed to update supplier' };
      } catch (error) {
        console.error('Error updating supplier:', error);
        return { error: error.message };
      }
    },

    delete: async (supplierId) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/suppliers/${supplierId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        return response.ok ? { success: true, message: 'Supplier deleted' } : { error: 'Failed to delete' };
      } catch (error) {
        console.error('Error deleting supplier:', error);
        return { error: error.message };
      }
    },

    getStats: async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/suppliers/stats`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : {};
      } catch (error) {
        console.error('Error fetching supplier stats:', error);
        return {};
      }
    }
  },

  // ─── Warehouses Service ────────────────────────────────────────────────────
  warehouses: {
    getAll: async () => {
      try {
        const url = `${API_BASE_URL}/auth/admin/warehouse/warehouses`;
        console.log('🔗 Fetching warehouses from:', url);
        console.log('🔑 Auth token:', getActiveToken()?.substring(0, 20) + '...');
        console.log('👤 User role:', getActiveRole());
        
        const response = await authFetch(url, {
          headers: getAuthHeaders()
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Warehouses data:', data);
          return data;
        } else {
          const errorText = await response.text();
          console.error('❌ API Error:', response.status, errorText);
          return [];
        }
      } catch (error) {
        console.error('❌ Error fetching warehouses:', error);
        return [];
      }
    },

    getById: async (warehouseId) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/warehouse/warehouses/${warehouseId}`, {
          headers: getAuthHeaders()
        });
        return response.ok ? await response.json() : null;
      } catch (error) {
        console.error('Error fetching warehouse:', error);
        return null;
      }
    },

    create: async (warehouseData) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/warehouse/warehouses`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(warehouseData)
        });
        return response.ok ? await response.json() : { error: 'Failed to create warehouse' };
      } catch (error) {
        console.error('Error creating warehouse:', error);
        return { error: error.message };
      }
    },

    update: async (warehouseId, warehouseData) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/warehouses/${warehouseId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(warehouseData)
        });
        return response.ok ? await response.json() : { error: 'Failed to update warehouse' };
      } catch (error) {
        console.error('Error updating warehouse:', error);
        return { error: error.message };
      }
    },

    delete: async (warehouseId) => {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/admin/warehouses/${warehouseId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        return response.ok ? { success: true, message: 'Warehouse deleted' } : { error: 'Failed to delete' };
      } catch (error) {
        console.error('Error deleting warehouse:', error);
        return { error: error.message };
      }
    }
  }
};

// ─── Warehouse Service (direct, matches WarehouseController exactly) ──────────
const WAREHOUSE_BASE = 'http://localhost:9999/api/warehouse/warehouses';

export const warehouseService = {
  getAllWarehouses: async () => {
    try {
      const res = await authFetch(WAREHOUSE_BASE, { headers: getAuthHeaders() });
      return res.ok ? await res.json() : [];
    } catch (e) { console.error('warehouseService.getAllWarehouses:', e); return []; }
  },

  getActiveWarehouses: async () => {
    try {
      const res = await authFetch(`${WAREHOUSE_BASE}/active`, { headers: getAuthHeaders() });
      return res.ok ? await res.json() : [];
    } catch (e) { console.error('warehouseService.getActiveWarehouses:', e); return []; }
  },

  getWarehouseById: async (id) => {
    try {
      const res = await authFetch(`${WAREHOUSE_BASE}/${id}`, { headers: getAuthHeaders() });
      return res.ok ? await res.json() : null;
    } catch (e) { console.error('warehouseService.getWarehouseById:', e); return null; }
  },

  createWarehouse: async (data) => {
    const res = await authFetch(WAREHOUSE_BASE, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t || 'Create failed'); }
    return res.json();
  },

  updateWarehouse: async (id, data) => {
    const res = await authFetch(`${WAREHOUSE_BASE}/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t || 'Update failed'); }
    return res.json();
  },

  deactivateWarehouse: async (id) => {
    const res = await authFetch(`${WAREHOUSE_BASE}/${id}`, {
      method: 'DELETE', headers: getAuthHeaders()
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t || 'Deactivate failed'); }
    return { success: true };
  },

  deleteWarehousePermanently: async (id) => {
    const res = await authFetch(`${WAREHOUSE_BASE}/${id}/permanent`, {
      method: 'DELETE', headers: getAuthHeaders()
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t || 'Delete failed'); }
    return { success: true };
  },

  getWarehouseLocations: async (id) => {
    try {
      const res = await authFetch(`${WAREHOUSE_BASE}/${id}/locations`, { headers: getAuthHeaders() });
      return res.ok ? await res.json() : [];
    } catch (e) { console.error('warehouseService.getWarehouseLocations:', e); return []; }
  },

  getActiveLocations: async (id) => {
    try {
      const res = await authFetch(`${WAREHOUSE_BASE}/${id}/locations/active`, { headers: getAuthHeaders() });
      return res.ok ? await res.json() : [];
    } catch (e) { console.error('warehouseService.getActiveLocations:', e); return []; }
  }
};

// Export individual services for backward compatibility
export const authService = imsService.auth;
export const productsService = imsService.products;
export const inventoryService = imsService.inventory;
export const pricingService = imsService.pricing;
export const ordersService = imsService.orders;
export const purchaseOrdersService = imsService.purchaseOrders;
export const suppliersService = imsService.suppliers;
export const warehousesService = imsService.warehouses;
export const imsApi = imsService;

// Export role management functions
export { getRoleBasedPath, getAuthHeaders };

export default imsService;