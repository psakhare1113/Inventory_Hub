// Enhanced Products Fetching Service for Both Admin and User
// This service handles product fetching with proper authentication and role-based access

const API_BASE_URL = 'http://localhost:9999/api';
const DIRECT_API_URL = 'http://localhost:9999/api';

// Enhanced authentication headers
// Checks sessionStorage first (admin session) then falls back to localStorage (user session)
const getActiveToken = () => {
  if (sessionStorage.getItem('isAdminSession') === 'true') {
    return sessionStorage.getItem('adminToken');
  }
  return localStorage.getItem('authToken') || localStorage.getItem('token');
};

const getActiveRole = () => {
  if (sessionStorage.getItem('isAdminSession') === 'true') return 'ADMIN';
  return localStorage.getItem('userRole') || localStorage.getItem('role') || 'USER';
};

const getEnhancedAuthHeaders = () => {
  const token = getActiveToken();
  const userRole = getActiveRole();
  
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
    'X-User-Role': userRole,
    'Accept': 'application/json'
  };
};

// Role-based API path generator
const getRoleBasedApiPath = (service, endpoint = '') => {
  const userRole = getActiveRole();
  const rolePrefix = userRole === 'ADMIN' ? 'admin' : 'user';
  const basePath = `${API_BASE_URL}/auth/${rolePrefix}/${service}`;
  return endpoint ? `${basePath}/${endpoint}` : basePath;
};

// Enhanced Products Service
export const enhancedProductsService = {
  // Fetch all products with multiple fallback strategies
  fetchAllProducts: async () => {
    console.log('🔄 Starting enhanced product fetch...');
    
    const strategies = [
      {
        name: 'Role-based API via Gateway',
        url: getRoleBasedApiPath('products'),
        headers: getEnhancedAuthHeaders()
      },
      {
        name: 'Direct Products API',
        url: `${DIRECT_API_URL}/products`,
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'Gateway Direct Route',
        url: `${API_BASE_URL}/products`,
        headers: { 'Content-Type': 'application/json' }
      }
    ];

    for (const strategy of strategies) {
      try {
        console.log(`🔍 Trying: ${strategy.name}`);
        const response = await fetch(strategy.url, {
          method: 'GET',
          headers: strategy.headers
        });

        if (response.ok) {
          const products = await response.json();
          console.log(`✅ Success with ${strategy.name}: ${products.length} products`);
          return {
            success: true,
            data: products,
            source: strategy.name,
            count: products.length
          };
        } else {
          console.warn(`⚠️ ${strategy.name} failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} error:`, error.message);
      }
    }

    console.error('🚫 All product fetching strategies failed');
    return {
      success: false,
      data: [],
      source: 'none',
      count: 0,
      error: 'All API endpoints failed'
    };
  },

  // Fetch categories with fallback
  fetchAllCategories: async () => {
    console.log('🔄 Fetching categories...');
    
    const strategies = [
      {
        name: 'Gateway Categories',
        url: `${API_BASE_URL}/categories`,
        headers: getEnhancedAuthHeaders()
      },
      {
        name: 'Role-based Categories',
        url: getRoleBasedApiPath('products', 'categories'),
        headers: getEnhancedAuthHeaders()
      },
      {
        name: 'Direct Categories API',
        url: `${DIRECT_API_URL}/categories`,
        headers: { 'Content-Type': 'application/json' }
      }
    ];

    for (const strategy of strategies) {
      try {
        const response = await fetch(strategy.url, {
          method: 'GET',
          headers: strategy.headers
        });

        if (response.ok) {
          const categories = await response.json();
          console.log(`✅ Categories loaded via ${strategy.name}: ${categories.length} items`);
          return categories;
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} failed:`, error.message);
      }
    }

    console.error('🚫 Failed to fetch categories');
    return [];
  },

  // Fetch subcategories with fallback
  fetchAllSubcategories: async () => {
    console.log('🔄 Fetching subcategories...');
    
    const strategies = [
      {
        name: 'Gateway Subcategories',
        url: `${API_BASE_URL}/subcategories`,
        headers: getEnhancedAuthHeaders()
      },
      {
        name: 'Role-based Subcategories',
        url: getRoleBasedApiPath('products', 'subcategories'),
        headers: getEnhancedAuthHeaders()
      },
      {
        name: 'Direct Subcategories API',
        url: `${DIRECT_API_URL}/subcategories`,
        headers: { 'Content-Type': 'application/json' }
      }
    ];

    for (const strategy of strategies) {
      try {
        const response = await fetch(strategy.url, {
          method: 'GET',
          headers: strategy.headers
        });

        if (response.ok) {
          const subcategories = await response.json();
          console.log(`✅ Subcategories loaded via ${strategy.name}: ${subcategories.length} items`);
          return subcategories;
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} failed:`, error.message);
      }
    }

    console.error('🚫 Failed to fetch subcategories');
    return [];
  },

  // Fetch pricing data with fallback
  fetchAllPricing: async () => {
    console.log('🔄 Fetching pricing...');
    
    const strategies = [
      {
        name: 'Role-based Pricing',
        url: getRoleBasedApiPath('products', 'pricing'),
        headers: getEnhancedAuthHeaders()
      },
      {
        name: 'Direct Pricing API',
        url: `${DIRECT_API_URL}/pricing`,
        headers: { 'Content-Type': 'application/json' }
      }
    ];

    for (const strategy of strategies) {
      try {
        const response = await fetch(strategy.url, {
          method: 'GET',
          headers: strategy.headers
        });

        if (response.ok) {
          const pricing = await response.json();
          console.log(`✅ Pricing loaded via ${strategy.name}: ${pricing.length} items`);
          return pricing;
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} failed:`, error.message);
      }
    }

    console.error('🚫 Failed to fetch pricing');
    return [];
  },

  // Comprehensive data loader for both admin and user
  loadAllProductData: async () => {
    console.log('🚀 Loading all product data...');
    
    try {
      const [productsResult, categories, subcategories, pricing] = await Promise.all([
        enhancedProductsService.fetchAllProducts(),
        enhancedProductsService.fetchAllCategories(),
        enhancedProductsService.fetchAllSubcategories(),
        enhancedProductsService.fetchAllPricing()
      ]);

      // Create pricing lookup map
      const pricingMap = pricing.reduce((map, p) => {
        map[p.productId] = p;
        return map;
      }, {});

      // Create category lookup map
      const categoryMap = categories.reduce((map, c) => {
        map[c.id] = c;
        return map;
      }, {});

      // Create subcategory lookup map
      const subcategoryMap = subcategories.reduce((map, s) => {
        map[s.id] = s;
        return map;
      }, {});

      // Enhance products with related data
      const enhancedProducts = productsResult.data.map(product => ({
        ...product,
        category: categoryMap[product.categoryId],
        subcategory: subcategoryMap[product.subcategoryId],
        pricing: pricingMap[product.productId],
        // Add computed fields for frontend
        displayPrice: pricingMap[product.productId]?.sellingPrice || product.price || 0,
        originalPrice: pricingMap[product.productId]?.mrp || null,
        categoryName: categoryMap[product.categoryId]?.name || `ID: ${product.categoryId}`,
        subcategoryName: subcategoryMap[product.subcategoryId]?.name || `ID: ${product.subcategoryId}`
      }));

      const result = {
        success: productsResult.success,
        products: enhancedProducts,
        categories,
        subcategories,
        pricing,
        metadata: {
          productsCount: enhancedProducts.length,
          categoriesCount: categories.length,
          subcategoriesCount: subcategories.length,
          pricingCount: pricing.length,
          source: productsResult.source,
          userRole: localStorage.getItem('userRole') || 'USER'
        }
      };

      console.log('✅ All product data loaded successfully:', result.metadata);
      return result;
    } catch (error) {
      console.error('❌ Failed to load product data:', error);
      return {
        success: false,
        products: [],
        categories: [],
        subcategories: [],
        pricing: [],
        metadata: {
          productsCount: 0,
          categoriesCount: 0,
          subcategoriesCount: 0,
          pricingCount: 0,
          source: 'error',
          error: error.message
        }
      };
    }
  },

  // Test all endpoints
  testAllEndpoints: async () => {
    console.log('🧪 Testing all product endpoints...');
    
    const endpoints = [
      { name: 'Admin Products', url: `${API_BASE_URL}/auth/admin/products` },
      { name: 'User Products', url: `${API_BASE_URL}/auth/user/products` },
      { name: 'Direct Products', url: `${DIRECT_API_URL}/products` },
      { name: 'Admin Categories', url: `${API_BASE_URL}/auth/admin/products/categories` },
      { name: 'User Categories', url: `${API_BASE_URL}/auth/user/products/categories` },
      { name: 'Direct Categories', url: `${DIRECT_API_URL}/categories` },
      { name: 'Admin Pricing', url: `${API_BASE_URL}/auth/admin/products/pricing` },
      { name: 'User Pricing', url: `${API_BASE_URL}/auth/user/products/pricing` },
      { name: 'Direct Pricing', url: `${DIRECT_API_URL}/pricing` }
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: getEnhancedAuthHeaders()
        });
        
        results.push({
          name: endpoint.name,
          url: endpoint.url,
          status: response.status,
          success: response.ok,
          data: response.ok ? await response.json() : null
        });
      } catch (error) {
        results.push({
          name: endpoint.name,
          url: endpoint.url,
          status: 'ERROR',
          success: false,
          error: error.message
        });
      }
    }

    console.table(results);
    return results;
  },

  // Real-time pricing fetch for specific products
  fetchRealTimePricing: async (productIds) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/user/pricing/priceByProductId?productIds=${productIds.join(',')}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching real-time pricing:', error);
    }
    return {};
  }
};

// Export for use in components
export default enhancedProductsService;