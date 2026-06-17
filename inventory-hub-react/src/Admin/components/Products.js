import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Package, Settings, X, Filter, EyeOff, Eye } from 'lucide-react';
import '../css/Products.css';
import '../css/ProductForm.css';
import { imsService } from '../../services/imsApi';
import { categoryFieldTemplates } from '../../services/categoryFieldTemplates';
import ApiService from '../../services/api';
import ProductForm from './ProductForm';
import SimpleProductForm from './SimpleProductForm';
import enhancedProductsService from '../../services/enhancedProductsService';

export default function Products() {
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [pricingData, setPricingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [highlightId, setHighlightId] = useState(null);
  const highlightRef = useRef(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [selectedProductForAttributes, setSelectedProductForAttributes] = useState(null);
  const [productAttributes, setProductAttributes] = useState({});
  const [newAttribute, setNewAttribute] = useState({ attributeName: '', attributeValue: '' });
  const [showBulkAttributesForm, setShowBulkAttributesForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [bulkAttributes, setBulkAttributes] = useState([{ attributeName: '', attributeValue: '' }]);
  const [categoryAttributeTemplates, setCategoryAttributeTemplates] = useState({});
  const [staticFields, setStaticFields] = useState([]);
  const [customAttributes, setCustomAttributes] = useState([]);
  const [dataSource, setDataSource] = useState('unknown');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [productStockMap, setProductStockMap] = useState({}); // productId -> { available, stockCount }

  useEffect(() => {
    loadProducts();
  }, []);

  const fetchCategoriesAndSubcategories = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      };
      const [catsRes, subsRes] = await Promise.all([
        fetch('http://localhost:9999/api/categories', { headers }),
        fetch('http://localhost:9999/api/subcategories', { headers })
      ]);
      const cats = catsRes.ok ? await catsRes.json() : [];
      const subs = subsRes.ok ? await subsRes.json() : [];
      setCategories(cats);
      setSubcategories(subs);
      return { cats, subs };
    } catch (err) {
      console.error('Error loading categories/subcategories:', err);
      return { cats: [], subs: [] };
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Admin Products: Loading data...');
      
      // Load categories directly (reliable route) + products in parallel
      const [result] = await Promise.all([
        enhancedProductsService.loadAllProductData(),
        fetchCategoriesAndSubcategories()
      ]);
      
      if (result.success) {
        setProducts(result.products || []);
        // categories/subcategories already set by fetchCategoriesAndSubcategories
        setPricingData(result.pricing || []);
        setDataSource(result.metadata.source);
        
        // Load stock info for all products
        if (result.products?.length > 0) {
          loadStockInfo(result.products);
        }
        
        console.log('✅ Admin Products: Data loaded successfully', {
          products: result.products.length,
          categories: result.categories.length,
          subcategories: result.subcategories.length,
          pricing: result.pricing.length,
          source: result.metadata.source
        });
        
        // Load attributes for all products
        const attributesMap = {};
        for (const product of result.products || []) {
          if (product && product.productId) {
            try {
              const attributes = await imsService.products.getProductAttributes(product.productId);
              attributesMap[product.productId] = attributes || [];
            } catch (err) {
              attributesMap[product.productId] = [];
            }
          }
        }
        setProductAttributes(attributesMap);
        
      } else {
        console.error('❌ Admin Products: Failed to load data', result);
        setError(`Failed to load products: ${result.metadata?.error || 'Unknown error'}`);
        setProducts([]);
        setPricingData([]);
      }
      
    } catch (err) {
      console.error('❌ Admin Products: Exception during load:', err);
      setError('Failed to connect to backend services. Please ensure all services are running.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadProducts();
  };

  // Fetch stock info for all products
  const loadStockInfo = async (productList) => {
    // Use session-aware token: admin session lives in sessionStorage, user in localStorage
    const isAdmin = sessionStorage.getItem('isAdminSession') === 'true';
    const token = isAdmin
      ? sessionStorage.getItem('adminToken')
      : (localStorage.getItem('authToken') || localStorage.getItem('token'));
    const headers = { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' };
    const map = {};
    await Promise.all(
      productList.map(async (p) => {
        try {
          const res = await fetch(
            `http://localhost:9999/api/auth/admin/inventory/stock/availability?productId=${p.productId}`,
            { headers }
          );
          if (res.ok) map[p.productId] = await res.json();
        } catch { /* ignore */ }
      })
    );
    setProductStockMap(map);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await imsService.products.deleteProduct(id);
        // Immediately remove from state
        setProducts(prev => prev.filter(p => p.productId !== id));
        try { await imsService.pricing.deletePricing(id); } catch {}
        localStorage.removeItem(`product_attributes_${id}`);
      } catch (err) {
        alert('Failed to delete product: ' + err.message);
      }
    }
  };

  const handleToggleHide = async (product) => {
    const newHidden = !product.hidden;
    const action = newHidden ? 'hide' : 'unhide';
    if (!window.confirm(`Are you sure you want to ${action} "${product.name}" from customer view?`)) return;
    try {
      const updatedProduct = { ...product, hidden: newHidden };
      await imsService.products.updateProduct(product.productId, updatedProduct);
      setProducts(prev =>
        prev.map(p => p.productId === product.productId ? { ...p, hidden: newHidden } : p)
      );
    } catch (err) {
      alert(`Failed to ${action} product: ` + err.message);
    }
  };

  const handleManageAttributes = async (product) => {
    setSelectedProductForAttributes(product);
    try {
      const attributes = await imsService.products.getProductAttributes(product.productId);
      setProductAttributes({ [product.productId]: attributes || [] });
    } catch (err) {
      console.warn('Attributes API not available for product', product.id, ':', err.message);
      // Set empty array if attributes API fails
      setProductAttributes({ [product.id]: [] });
    }
    setShowAttributesModal(true);
  };

  const handleAddAttribute = async () => {
    if (!newAttribute.attributeName || !newAttribute.attributeValue) {
      alert('Please fill both attribute name and value');
      return;
    }
    
    try {
      await imsService.products.addProductAttribute(selectedProductForAttributes.productId, newAttribute);
      const updatedAttributes = await imsService.products.getProductAttributes(selectedProductForAttributes.productId);
      setProductAttributes(prev => ({ ...prev, [selectedProductForAttributes.productId]: updatedAttributes || [] }));
      setNewAttribute({ attributeName: '', attributeValue: '' });
      alert('Attribute added successfully!');
      // Reload products to refresh the main table
      loadProducts();
    } catch (err) {
      console.error('Failed to add attribute:', err);
      if (err.message.includes('400')) {
        alert('Backend error: Attributes API endpoint may not be properly configured. Please check your backend server.');
      } else {
        alert('Failed to add attribute: ' + err.message);
      }
    }
  };

  // Static predefined attributes with dropdown options for each category
  const getCategoryStaticFields = (categoryId) => {
    // First try to get from backend, then fallback to templates
    const category = categories.find(cat => cat.id == categoryId);
    if (category) {
      const template = categoryFieldTemplates.getTemplate(category.name);
      return template;
    }
    
    // Fallback to old static mapping
    const staticFields = {
      '1': [ // test category
        { name: 'Brand', options: ['Apple', 'Samsung', 'Sony', 'LG', 'Other'] },
        { name: 'Model', options: [] }, // Free text
        { name: 'Type', options: ['Premium', 'Standard', 'Basic'] },
        { name: 'Features', options: ['Wireless', 'Bluetooth', 'Touch Screen', 'Voice Control'] },
        { name: 'Warranty', options: ['1 Year', '2 Years', '3 Years', 'No Warranty'] },
        { name: 'Color', options: ['Black', 'White', 'Silver', 'Gold', 'Blue', 'Red'] }
      ],
      '2': [ // Electronics
        { name: 'RAM', options: ['4GB', '8GB', '16GB', '32GB', '64GB'] },
        { name: 'Storage', options: ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'] },
        { name: 'Camera', options: ['12MP', '48MP', '64MP', '108MP', 'No Camera'] },
        { name: 'Battery', options: ['3000mAh', '4000mAh', '5000mAh', '6000mAh'] },
        { name: 'Processor', options: ['Snapdragon 888', 'A15 Bionic', 'Exynos 2100', 'MediaTek Dimensity'] },
        { name: 'Display', options: ['OLED', 'AMOLED', 'LCD', 'IPS', 'Retina'] },
        { name: 'Screen Size', options: ['5.5"', '6.1"', '6.4"', '6.7"', '7.0"'] },
        { name: 'OS', options: ['Android 12', 'Android 13', 'iOS 15', 'iOS 16', 'Windows 11'] }
      ],
      '4': [ // Furniture
        { name: 'Material', options: ['Wood', 'Metal', 'Plastic', 'Glass', 'Fabric', 'Leather'] },
        { name: 'Dimensions', options: [] }, // Free text
        { name: 'Weight', options: ['Under 5kg', '5-10kg', '10-20kg', '20-50kg', 'Over 50kg'] },
        { name: 'Color', options: ['Brown', 'Black', 'White', 'Gray', 'Beige', 'Natural Wood'] },
        { name: 'Warranty', options: ['6 Months', '1 Year', '2 Years', '5 Years', 'Lifetime'] },
        { name: 'Assembly Required', options: ['Yes', 'No', 'Partial'] }
      ]
    };
    return staticFields[categoryId.toString()] || [];
  };

  // Dynamic category-wise attribute templates from backend
  const getCategoryAttributesFromBackend = async (categoryId) => {
    try {
      const attributes = await imsService.products.getCategoryAttributes(categoryId);
      return attributes.map(attr => attr.attributeName);
    } catch (error) {
      console.warn('Failed to fetch category attributes from backend:', error);
      // Fallback to default attributes if backend call fails
      return ['Brand', 'Model', 'Color', 'Size', 'Material', 'Warranty'];
    }
  };

  // Legacy static templates (kept as fallback)
  const getAttributeTemplates = (categoryId) => {
    const templates = {
      '1': ['Brand', 'Model', 'Type', 'Features', 'Warranty', 'Color'], // test
      '2': ['RAM', 'Storage', 'Camera', 'Battery', 'Processor', 'Display', 'Screen Size', 'OS'], // Electronics
      '4': ['Material', 'Dimensions', 'Weight', 'Color', 'Warranty', 'Assembly Required'] // Furniture
    };
    return templates[categoryId.toString()] || ['Brand', 'Model', 'Color', 'Size', 'Material', 'Warranty'];
  };

  // Debug function to help you see the actual categories from backend
  const logCategoriesForMapping = () => {
    console.log('=== CATEGORIES FROM BACKEND ===');
    categories.forEach(category => {
      console.log(`ID: ${category.id}, Name: ${category.name}`);
    });
    console.log('Update the getAttributeTemplates function with these IDs');
  };

  const handleBulkAttributeAdd = async () => {
    await fetchCategoriesAndSubcategories();
    setShowBulkAttributesForm(true);
  };

  const handleCategoryChange = async (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedProductId('');
    // Filter products by category
    const filteredProducts = products.filter(product => product.categoryId == categoryId);
    setCategoryProducts(filteredProducts);
    
    // Get static fields for this category
    const categoryStaticFields = getCategoryStaticFields(categoryId);
    setStaticFields(categoryStaticFields);
    
    // Initialize static fields with empty values
    const initialStaticAttributes = categoryStaticFields.map(field => ({
      attributeName: field.name,
      attributeValue: '',
      isStatic: true,
      options: field.options
    }));
    
    setBulkAttributes(initialStaticAttributes);
    setCustomAttributes([]);
    
    // Also try to sync with backend (create category attributes if they don't exist)
    try {
      const existingAttributes = await getCategoryAttributesFromBackend(categoryId);
      const staticFieldNames = categoryStaticFields.map(f => f.name);
      
      // Check if we need to add static fields to backend
      const missingFields = staticFieldNames.filter(name => !existingAttributes.includes(name));
      if (missingFields.length > 0) {
        await imsService.products.createCategoryAttributes(categoryId, staticFieldNames);
        console.log(`Added ${missingFields.length} static fields to backend for category ${categoryId}`);
      }
    } catch (error) {
      console.warn('Could not sync static fields with backend:', error);
    }
  };

  const handleAddMoreAttribute = async () => {
    const newCustomAttribute = { 
      attributeName: '', 
      attributeValue: '', 
      isStatic: false, 
      options: [] 
    };
    setCustomAttributes([...customAttributes, newCustomAttribute]);
  };

  const handleRemoveAttribute = async (index, isCustom = false) => {
    if (isCustom) {
      setCustomAttributes(customAttributes.filter((_, i) => i !== index));
    } else {
      // Can't remove static fields, only clear their values
      const updatedAttributes = [...bulkAttributes];
      updatedAttributes[index].attributeValue = '';
      setBulkAttributes(updatedAttributes);
    }
  };

  const handleAttributeChange = (index, field, value, isCustom = false) => {
    if (isCustom) {
      const updatedCustomAttributes = [...customAttributes];
      updatedCustomAttributes[index][field] = value;
      setCustomAttributes(updatedCustomAttributes);
    } else {
      const updatedAttributes = [...bulkAttributes];
      updatedAttributes[index][field] = value;
      setBulkAttributes(updatedAttributes);
    }
  };

  const handleSubmitBulkAttributes = async () => {
    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }

    // Combine static and custom attributes
    const allAttributes = [
      ...bulkAttributes.filter(attr => attr.attributeValue), // Only static fields with values
      ...customAttributes.filter(attr => attr.attributeName && attr.attributeValue) // Only custom fields with both name and value
    ];

    if (allAttributes.length === 0) {
      alert('Please add at least one attribute with a value');
      return;
    }

    try {
      // Add custom attributes to backend category attributes if they don't exist
      const customAttributeNames = customAttributes
        .filter(attr => attr.attributeName && attr.attributeValue)
        .map(attr => attr.attributeName);
      
      if (customAttributeNames.length > 0) {
        try {
          // Get existing category attributes
          const existingAttributes = await getCategoryAttributesFromBackend(selectedCategory);
          const newAttributeNames = customAttributeNames.filter(name => !existingAttributes.includes(name));
          
          if (newAttributeNames.length > 0) {
            // Add new custom attributes to category
            const allCategoryAttributes = [...existingAttributes, ...newAttributeNames];
            await imsService.products.createCategoryAttributes(selectedCategory, allCategoryAttributes);
            console.log(`Added ${newAttributeNames.length} new custom attributes to category ${selectedCategory}`);
          }
        } catch (error) {
          console.warn('Could not update category attributes:', error);
        }
      }

      // Add each attribute to the selected product using bulk endpoint
      const attributesMap = {};
      for (const attribute of allAttributes) {
        attributesMap[attribute.attributeName] = attribute.attributeValue;
      }
      const result = await imsService.products.saveAttributesBulk(selectedProductId, attributesMap);
      if (result.error) throw new Error(result.error);
      
      alert(`Successfully added ${allAttributes.length} attributes to the product!`);
      setShowBulkAttributesForm(false);
      setSelectedCategory('');
      setSelectedProductId('');
      setBulkAttributes([{ attributeName: '', attributeValue: '' }]);
      setCustomAttributes([]);
      setStaticFields([]);
      setCategoryProducts([]);
      loadProducts(); // Refresh the products list
    } catch (err) {
      console.error('Failed to add bulk attributes:', err);
      alert('Failed to add attributes: ' + err.message);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:9999/api/images/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadedImageUrl(data.imageUrl);
        alert('Image uploaded successfully!');
      } else {
        alert('Upload failed: ' + data.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('URL copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy URL');
    });
  };

  const resetImageModal = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setUploadedImageUrl(null);
    setShowImageModal(false);
  };

  // ── Pick up search term / highlight from Navbar navigation ──────────────
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
    if (location.state?.highlightProductId) {
      setHighlightId(location.state.highlightProductId);
      // Auto-scroll to highlighted row after render
      setTimeout(() => {
        if (highlightRef.current) {
          highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Remove highlight after 3 s
        setTimeout(() => setHighlightId(null), 3000);
      }, 400);
    }
  }, [location.state]);

  // ── Filtered products (search + category + status) ────────────────────────
  const filteredProducts = products.filter((product) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      product.name?.toLowerCase().includes(q) ||
      product.productBarcode?.toLowerCase().includes(q) ||
      product.description?.toLowerCase().includes(q);

    const matchesCategory =
      !filterCategory || String(product.categoryId) === String(filterCategory);

    const matchesStatus =
      !filterStatus ||
      (product.status || 'ACTIVE').toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeFiltersCount = [filterCategory, filterStatus].filter(Boolean).length;

  if (loading) return (
    <div className="products-loading">
      <div className="products-loading-spinner" />
      <span>Loading products…</span>
    </div>
  );

  return (
    <div className="admin products-page">
      {/* ── Page Header ── */}
      <div className="products-header">
        <div className="products-header-left">
          <h2>Products Management</h2>
          <span className={`products-status-badge ${error ? 'error' : 'success'}`}>
            {error ? '❌ Backend Error' : `✅ ${dataSource}`}
          </span>
        </div>
        <div className="products-header-actions">
          <button className="add-product-btn" onClick={() => setShowAddForm(true)}>
            <Plus size={16} />
            Add Product
          </button>
          <button className="add-attributes-btn" onClick={handleBulkAttributeAdd}>
            <Settings size={16} />
            Attributes
          </button>
          <button className="refresh-btn-pro" onClick={loadProducts} title="Refresh">
            🔄
          </button>
        </div>
      </div>

      <div className="products-card">
        {/* ── Search + Filter Bar ── */}
        <div className="products-toolbar">
          {/* Search input */}
          <div className="products-search-box">
            <Search className="psb-icon" size={16} />
            <input
              type="text"
              className="psb-input"
              placeholder="Search by name, barcode, description…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
            {searchTerm && (
              <button className="psb-clear" onClick={() => setSearchTerm('')} aria-label="Clear">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="products-filter-select-wrap">
            <Filter size={14} className="pfs-icon" />
            <select
              className="products-filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="products-filter-select-wrap">
            <select
              className="products-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Clear all filters */}
          {(searchTerm || activeFiltersCount > 0) && (
            <button
              className="products-clear-filters"
              onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterStatus(''); }}
            >
              <X size={13} /> Clear
            </button>
          )}

          {/* Result count */}
          <span className="products-result-count">
            {filteredProducts.length} / {products.length} products
          </span>
        </div>

        {/* Active filter chips */}
        {activeFiltersCount > 0 && (
          <div className="products-filter-chips">
            {filterCategory && (
              <span className="filter-chip">
                {categories.find(c => String(c.id) === String(filterCategory))?.name || filterCategory}
                <button onClick={() => setFilterCategory('')}><X size={11} /></button>
              </span>
            )}
            {filterStatus && (
              <span className="filter-chip">
                {filterStatus}
                <button onClick={() => setFilterStatus('')}><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {/* Simple compact product form */}
        <SimpleProductForm
          isOpen={showAddForm}
          onClose={handleCloseForm}
          editingProduct={editingProduct}
          onSuccess={handleFormSuccess}
        />

        {error && (
          <div className="products-error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Pricing Info</th>
              <th>Stock</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const category = categories.find(cat => cat.id === product.categoryId);
                const subcategory = subcategories.find(sub => sub.id === product.subcategoryId);
                const productPricing = pricingData.find(p => p.productId === product.productId);
                
                const attributes = productAttributes[product.productId] || [];
                
                const isHighlighted = highlightId === product.productId;
                return (
                  <tr
                    key={product.productId}
                    ref={isHighlighted ? highlightRef : null}
                    className={[
                      isHighlighted ? 'product-row-highlight' : '',
                      product.hidden ? 'product-row-hidden' : ''
                    ].filter(Boolean).join(' ')}
                  >
                    <td>{product.productId}</td>
                    <td>
                      <div className="product-info">
                        <div className="product-avatar">
                          📦
                        </div>
                        <div>
                          <div className="product-name">{product.name || 'Unnamed Product'}</div>
                          {product.description && (
                            <div className="product-description" style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
                              {product.description.length > 60 ? product.description.substring(0, 60) + '...' : product.description}
                            </div>
                          )}
                          <div className="product-barcode" style={{ color: '#888', fontSize: '11px' }}>Barcode: {product.productBarcode}</div>
                          {attributes.length > 0 && (
                            <div className="product-attributes">
                              <div style={{display: 'flex', flexWrap: 'wrap', gap: '2px'}}>
                                {attributes.slice(0, 3).map((attr, idx) => (
                                  <span key={idx} className="attribute-badge">
                                    {attr.attributeName} {attr.attributeValue}
                                  </span>
                                ))}
                                {attributes.length > 3 && (
                                  <span className="attribute-badge more-badge">
                                    +{attributes.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {product.productUrl && (
                            <div className="product-url">
                              <a href={product.productUrl} target="_blank" rel="noopener noreferrer">
                                View Image
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{category?.name || `ID: ${product.categoryId}`}</td>
                    <td>{subcategory?.name || `ID: ${product.subcategoryId}`}</td>
                    <td>
                      {productPricing ? (
                        <div style={{fontSize: '12px'}}>
                          <div><strong>MRP:</strong> ₹{productPricing.mrp}</div>
                          <div><strong>Selling:</strong> ₹{productPricing.sellingPrice}</div>
                          <div><strong>Unit:</strong> {productPricing.unitSize} {productPricing.unitLabel}</div>
                          <div style={{color: 'green'}}>
                            <strong>Discount:</strong> {((productPricing.mrp - productPricing.sellingPrice) / productPricing.mrp * 100).toFixed(1)}%
                          </div>
                        </div>
                      ) : (
                        <span style={{color: '#999', fontSize: '12px'}}>No pricing set</span>
                      )}
                    </td>
                    <td>
                      {/* Inventory Stock Status */}
                      {(() => {
                        const stock = productStockMap[product.productId];
                        if (!stock) return <span style={{color:'#999', fontSize:'12px'}}>Loading...</span>;
                        return stock.available ? (
                          <div style={{fontSize:'12px'}}>
                            <span style={{background:'#d4edda', color:'#155724', padding:'2px 8px', borderRadius:'12px', fontWeight:'bold'}}>
                              ✓ Available
                            </span>
                            <div style={{marginTop:'4px', color:'#555'}}>
                              <strong>{stock.stockCount}</strong> unit{stock.stockCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        ) : (
                          <span style={{background:'#f8d7da', color:'#721c24', padding:'2px 8px', borderRadius:'12px', fontWeight:'bold', fontSize:'12px'}}>
                            ✗ Out of Stock
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="product-rating">★ {product.rating || 'No rating'}/5</div>
                    </td>
                    <td>
                      <span className={`status-badge ${(product.status || 'ACTIVE').toLowerCase()}`}>
                        {product.status || 'ACTIVE'}
                      </span>
                      {product.hidden && (
                        <span className="hidden-badge" title="Hidden from customers">
                          <EyeOff size={11} /> Hidden
                        </span>
                      )}
                    </td>
                    <td className="product-action-col">
                      <div className="product-action-buttons">
                        <Edit 
                          className="product-edit-icon" 
                          size={16} 
                          onClick={() => handleEditProduct(product)}
                          title="Edit Product"
                        />
                        <button
                          className={`product-hide-btn ${product.hidden ? 'unhide' : 'hide'}`}
                          onClick={() => handleToggleHide(product)}
                          title={product.hidden ? 'Unhide Product (currently hidden from customers)' : 'Hide Product from customers'}
                        >
                          {product.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                          {product.hidden ? 'Unhide' : 'Hide'}
                        </button>
                        <Trash2 
                          className="product-delete-icon" 
                          size={16} 
                          onClick={() => handleDeleteProduct(product.productId)}
                          title="Delete Product"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                  {loading ? 'Loading products...' : 'No products found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Attributes Form Modal */}
      {showBulkAttributesForm && (
        <div className="modal-overlay">
          <div className="bulk-attributes-modal">
            <div className="modal-header">
              <h3>Add Product Attributes</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowBulkAttributesForm(false);
                  setSelectedCategory('');
                  setSelectedProductId('');
                  setBulkAttributes([{ attributeName: '', attributeValue: '' }]);
                  setCategoryProducts([]);
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {/* Category Selection */}
              <div className="form-group">
                <label>Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Selection */}
              {selectedCategory && (
                <div className="form-group">
                  <label>Product ({categoryProducts.length} available)</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select product...</option>
                    {categoryProducts.map(product => (
                      <option key={product.productId} value={product.productId}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Attributes Section */}
              {selectedCategory && (
                <div className="form-group">
                  <div className="attributes-header">
                    <label>Category Attributes</label>
                  </div>
                  
                  {/* Static Fields */}
                  <div className="attributes-list">
                    {bulkAttributes.map((attribute, index) => (
                      <div key={`static-${index}`} className="attribute-row">
                        <input
                          type="text"
                          value={attribute.attributeName}
                          readOnly
                          className="attribute-input static-field"
                          style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                        />
                        {attribute.options && attribute.options.length > 0 ? (
                          <select
                            value={attribute.attributeValue}
                            onChange={(e) => handleAttributeChange(index, 'attributeValue', e.target.value, false)}
                            className="attribute-input"
                          >
                            <option value="">Select {attribute.attributeName}...</option>
                            {attribute.options.map((option, optIndex) => (
                              <option key={optIndex} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder={`Enter ${attribute.attributeName}`}
                            value={attribute.attributeValue}
                            onChange={(e) => handleAttributeChange(index, 'attributeValue', e.target.value, false)}
                            className="attribute-input"
                          />
                        )}
                        <button 
                          onClick={() => handleAttributeChange(index, 'attributeValue', '', false)}
                          className="clear-btn"
                          title="Clear Value"
                          style={{ 
                            background: '#6c757d', color: 'white', border: 'none',
                            width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Custom Attributes Section */}
                  {customAttributes.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <div className="attributes-header">
                        <label>Custom Attributes</label>
                      </div>
                      <div className="attributes-list">
                        {customAttributes.map((attribute, index) => (
                          <div key={`custom-${index}`} className="attribute-row">
                            <input
                              type="text"
                              placeholder="Attribute Name"
                              value={attribute.attributeName}
                              onChange={(e) => handleAttributeChange(index, 'attributeName', e.target.value, true)}
                              className="attribute-input"
                            />
                            <input
                              type="text"
                              placeholder="Attribute Value"
                              value={attribute.attributeValue}
                              onChange={(e) => handleAttributeChange(index, 'attributeValue', e.target.value, true)}
                              className="attribute-input"
                            />
                            <button 
                              onClick={() => handleRemoveAttribute(index, true)}
                              className="remove-btn"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add More Button */}
                  <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <button 
                      onClick={handleAddMoreAttribute}
                      className="add-more-btn"
                    >
                      + Add Custom Attribute
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="modal-footer">
              <button 
                onClick={() => {
                  setShowBulkAttributesForm(false);
                  setSelectedCategory('');
                  setSelectedProductId('');
                  setBulkAttributes([{ attributeName: '', attributeValue: '' }]);
                  setCategoryProducts([]);
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
              {selectedProductId && (
                <button 
                  onClick={handleSubmitBulkAttributes}
                  className="btn-submit"
                >
                  Add Attributes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageModal && (
        <div className="modal-overlay">
          <div className="image-upload-modal" style={{
            background: 'white', padding: '30px', borderRadius: '12px',
            width: '500px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="modal-header">
              <h3>Upload Product Image</h3>
              <button 
                className="close-btn"
                onClick={resetImageModal}
                style={{
                  position: 'absolute', top: '15px', right: '15px',
                  background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body" style={{ marginTop: '20px' }}>
              {/* File Selection */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Choose Image File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{
                    width: '100%', padding: '10px', border: '2px dashed #ddd',
                    borderRadius: '8px', cursor: 'pointer'
                  }}
                />
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="image-preview" style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Preview</label>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{
                      maxWidth: '100%', maxHeight: '200px', border: '1px solid #ddd',
                      borderRadius: '8px', objectFit: 'contain'
                    }}
                  />
                </div>
              )}

              {/* Upload Button */}
              {selectedFile && !uploadedImageUrl && (
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <button 
                    onClick={uploadImage}
                    disabled={uploading}
                    style={{
                      background: uploading ? '#6c757d' : '#28a745',
                      color: 'white', border: 'none', padding: '12px 24px',
                      borderRadius: '6px', cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </div>
              )}

              {/* Uploaded URL */}
              {uploadedImageUrl && (
                <div className="uploaded-url" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'green' }}>✅ Upload Successful!</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={uploadedImageUrl}
                      readOnly
                      style={{
                        flex: 1, padding: '10px', border: '1px solid #ddd',
                        borderRadius: '4px', backgroundColor: '#f8f9fa'
                      }}
                    />
                    <button 
                      onClick={() => copyToClipboard(uploadedImageUrl)}
                      style={{
                        background: '#007bff', color: 'white', border: 'none',
                        padding: '10px 15px', borderRadius: '4px', cursor: 'pointer'
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <img 
                      src={uploadedImageUrl} 
                      alt="Uploaded" 
                      style={{
                        maxWidth: '100%', maxHeight: '150px', border: '1px solid #ddd',
                        borderRadius: '8px', objectFit: 'contain'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: '20px', textAlign: 'right' }}>
              <button 
                onClick={resetImageModal}
                style={{
                  background: '#6c757d', color: 'white', border: 'none',
                  padding: '10px 20px', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attributes Management Modal */}
      {showAttributesModal && selectedProductForAttributes && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', padding: '30px', borderRadius: '12px',
            width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <h3>Manage Attributes - {selectedProductForAttributes.productBarcode}</h3>
            
            {/* Add New Attribute */}
            <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h4>Add New Attribute</h4>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Attribute Name (e.g., color, storage)"
                  value={newAttribute.attributeName}
                  onChange={(e) => setNewAttribute({...newAttribute, attributeName: e.target.value})}
                  style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  placeholder="Attribute Value (e.g., White, 200GB)"
                  value={newAttribute.attributeValue}
                  onChange={(e) => setNewAttribute({...newAttribute, attributeValue: e.target.value})}
                  style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <button 
                  onClick={handleAddAttribute}
                  style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Existing Attributes */}
            <div style={{ marginBottom: '20px' }}>
              <h4>Current Attributes</h4>
              {productAttributes[selectedProductForAttributes.productId]?.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Attribute</th>
                      <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productAttributes[selectedProductForAttributes.productId].map((attr, index) => (
                      <tr key={index}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{attr.attributeName}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{attr.attributeValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No attributes added yet</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowAttributesModal(false);
                  setSelectedProductForAttributes(null);
                  setNewAttribute({ attributeName: '', attributeValue: '' });
                }}
                style={{ padding: '12px 24px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}