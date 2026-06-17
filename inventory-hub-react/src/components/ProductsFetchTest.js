import React, { useState, useEffect } from 'react';
import enhancedProductsService from '../services/enhancedProductsService';

const ProductsFetchTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState('USER');

  useEffect(() => {
    // Set initial user role for testing
    localStorage.setItem('userRole', currentUser);
  }, [currentUser]);

  const runComprehensiveTest = async () => {
    setLoading(true);
    setTestResults({});

    try {
      console.log('🧪 Starting comprehensive products fetch test...');

      // Test 1: Test all endpoints
      console.log('📡 Testing all API endpoints...');
      const endpointTests = await enhancedProductsService.testAllEndpoints();
      
      // Test 2: Load all product data as ADMIN
      console.log('👨‍💼 Testing as ADMIN...');
      localStorage.setItem('userRole', 'ADMIN');
      const adminResult = await enhancedProductsService.loadAllProductData();
      
      // Test 3: Load all product data as USER
      console.log('👤 Testing as USER...');
      localStorage.setItem('userRole', 'USER');
      const userResult = await enhancedProductsService.loadAllProductData();

      // Test 4: Test individual services
      console.log('🔍 Testing individual services...');
      const productsTest = await enhancedProductsService.fetchAllProducts();
      const categoriesTest = await enhancedProductsService.fetchAllCategories();
      const subcategoriesTest = await enhancedProductsService.fetchAllSubcategories();
      const pricingTest = await enhancedProductsService.fetchAllPricing();

      setTestResults({
        endpointTests,
        adminResult,
        userResult,
        individualTests: {
          products: productsTest,
          categories: categoriesTest,
          subcategories: subcategoriesTest,
          pricing: pricingTest
        },
        timestamp: new Date().toISOString()
      });

      console.log('✅ Comprehensive test completed');
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
      // Restore original user role
      localStorage.setItem('userRole', currentUser);
    }
  };

  const switchUserRole = (role) => {
    setCurrentUser(role);
    localStorage.setItem('userRole', role);
  };

  const renderEndpointTests = () => {
    if (!testResults.endpointTests) return null;

    return (
      <div className="test-section">
        <h3>🌐 API Endpoints Test</h3>
        <div className="endpoint-results">
          {testResults.endpointTests.map((test, index) => (
            <div key={index} className={`endpoint-result ${test.success ? 'success' : 'error'}`}>
              <div className="endpoint-name">
                {test.success ? '✅' : '❌'} {test.name}
              </div>
              <div className="endpoint-details">
                <div>Status: {test.status}</div>
                <div>URL: {test.url}</div>
                {test.data && (
                  <div>Data Count: {Array.isArray(test.data) ? test.data.length : 'N/A'}</div>
                )}
                {test.error && (
                  <div className="error-message">Error: {test.error}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDataResult = (title, result, icon) => {
    if (!result) return null;

    return (
      <div className="test-section">
        <h3>{icon} {title}</h3>
        <div className={`data-result ${result.success ? 'success' : 'error'}`}>
          <div className="result-summary">
            <div>Success: {result.success ? '✅' : '❌'}</div>
            <div>Products: {result.products?.length || 0}</div>
            <div>Categories: {result.categories?.length || 0}</div>
            <div>Subcategories: {result.subcategories?.length || 0}</div>
            <div>Pricing: {result.pricing?.length || 0}</div>
            {result.metadata && (
              <>
                <div>Source: {result.metadata.source}</div>
                <div>User Role: {result.metadata.userRole}</div>
              </>
            )}
            {result.metadata?.error && (
              <div className="error-message">Error: {result.metadata.error}</div>
            )}
          </div>
          
          {result.products && result.products.length > 0 && (
            <details className="products-details">
              <summary>View Products ({result.products.length})</summary>
              <div className="products-list">
                {result.products.slice(0, 5).map((product, index) => (
                  <div key={index} className="product-item">
                    <div>ID: {product.productId}</div>
                    <div>Name: {product.name || 'N/A'}</div>
                    <div>Barcode: {product.productBarcode}</div>
                    <div>Category: {product.categoryName || product.categoryId}</div>
                    <div>Price: ₹{product.displayPrice || product.price || 0}</div>
                  </div>
                ))}
                {result.products.length > 5 && (
                  <div>... and {result.products.length - 5} more products</div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="products-fetch-test">
      <style jsx>{`
        .products-fetch-test {
          max-width: 1200px;
          margin: 20px auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        
        .test-header {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        
        .test-controls {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .role-selector {
          display: flex;
          gap: 5px;
        }
        
        .role-btn {
          padding: 5px 10px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          border-radius: 4px;
        }
        
        .role-btn.active {
          background: #007bff;
          color: white;
        }
        
        .test-btn {
          padding: 10px 20px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .test-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        
        .test-section {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .endpoint-results {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 10px;
        }
        
        .endpoint-result {
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .endpoint-result.success {
          background: #d4edda;
          border-color: #c3e6cb;
        }
        
        .endpoint-result.error {
          background: #f8d7da;
          border-color: #f5c6cb;
        }
        
        .endpoint-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .endpoint-details {
          font-size: 12px;
          color: #666;
        }
        
        .data-result {
          padding: 15px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .data-result.success {
          background: #d4edda;
          border-color: #c3e6cb;
        }
        
        .data-result.error {
          background: #f8d7da;
          border-color: #f5c6cb;
        }
        
        .result-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .products-details {
          margin-top: 10px;
        }
        
        .products-list {
          max-height: 300px;
          overflow-y: auto;
          margin-top: 10px;
        }
        
        .product-item {
          padding: 8px;
          border: 1px solid #eee;
          margin-bottom: 5px;
          border-radius: 4px;
          background: #f9f9f9;
          font-size: 12px;
        }
        
        .error-message {
          color: #dc3545;
          font-weight: bold;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }
      `}</style>

      <div className="test-header">
        <h1>🧪 Products Fetch Test - Admin & User</h1>
        <p>This component tests product fetching for both admin and user roles using the enhanced products service.</p>
      </div>

      <div className="test-controls">
        <div>Current Role:</div>
        <div className="role-selector">
          <button 
            className={`role-btn ${currentUser === 'USER' ? 'active' : ''}`}
            onClick={() => switchUserRole('USER')}
          >
            👤 USER
          </button>
          <button 
            className={`role-btn ${currentUser === 'ADMIN' ? 'active' : ''}`}
            onClick={() => switchUserRole('ADMIN')}
          >
            👨‍💼 ADMIN
          </button>
        </div>
        
        <button 
          className="test-btn"
          onClick={runComprehensiveTest}
          disabled={loading}
        >
          {loading ? '🔄 Testing...' : '🧪 Run Comprehensive Test'}
        </button>
      </div>

      {loading && (
        <div className="loading">
          <div>🔄 Running comprehensive products fetch test...</div>
          <div>This may take a few seconds...</div>
        </div>
      )}

      {testResults.error && (
        <div className="test-section">
          <h3>❌ Test Error</h3>
          <div className="error-message">{testResults.error}</div>
        </div>
      )}

      {testResults.timestamp && (
        <div className="test-section">
          <h3>📊 Test Summary</h3>
          <div>Test completed at: {new Date(testResults.timestamp).toLocaleString()}</div>
          <div>Current user role: {currentUser}</div>
        </div>
      )}

      {renderEndpointTests()}
      {renderDataResult('Admin Data Load Test', testResults.adminResult, '👨‍💼')}
      {renderDataResult('User Data Load Test', testResults.userResult, '👤')}

      {testResults.individualTests && (
        <div className="test-section">
          <h3>🔍 Individual Service Tests</h3>
          <div className="result-summary">
            <div>Products: {testResults.individualTests.products?.success ? '✅' : '❌'} ({testResults.individualTests.products?.count || 0})</div>
            <div>Categories: {testResults.individualTests.categories?.length > 0 ? '✅' : '❌'} ({testResults.individualTests.categories?.length || 0})</div>
            <div>Subcategories: {testResults.individualTests.subcategories?.length > 0 ? '✅' : '❌'} ({testResults.individualTests.subcategories?.length || 0})</div>
            <div>Pricing: {testResults.individualTests.pricing?.length > 0 ? '✅' : '❌'} ({testResults.individualTests.pricing?.length || 0})</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsFetchTest;