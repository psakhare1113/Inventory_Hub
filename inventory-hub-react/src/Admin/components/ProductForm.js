import React, { useState, useEffect } from 'react';
import { imsService } from '../../services/imsApi';
import { Package, Smartphone, Sofa, Shirt, Book, Dumbbell, X, Lightbulb, Sparkles } from 'lucide-react';
import '../css/Categories.css';
import '../css/ProductForm.css';
import ImageUpload from './ImageUpload';

// ── Selling Price Formula ──────────────────────────────────────────────────
// sellingPrice = costPrice + packagingCost + shippingCost + profitMargin + GST(on costPrice)
const calcSellingPrice = (cp, pkg, ship, pm, gst) => {
  const cost     = parseFloat(cp)   || 0;
  const pkgCost  = parseFloat(pkg)  || 0;
  const shipCost = parseFloat(ship) || 0;
  const profit   = parseFloat(pm)   || 0;
  const gstRate  = parseFloat(gst)  || 18;
  if (cost <= 0) return '';
  const gstAmt = cost * gstRate / 100;
  return (cost + pkgCost + shipCost + profit + gstAmt).toFixed(2);
};

const calcDiscount = (mrp, sp) => {
  const m = parseFloat(mrp);
  const s = parseFloat(sp);
  if (m > 0 && s >= 0 && s <= m) return ((m - s) / m * 100).toFixed(2);
  return '';
};

// Auto-generate a unique barcode
const generateBarcode = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PRD-${timestamp}-${random}`;
};

export default function ProductForm({ isOpen, onClose, editingProduct, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [attributes, setAttributes] = useState([{ name: '', value: '' }]);
  const [dynamicCategoryAttributes, setDynamicCategoryAttributes] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [product, setProduct] = useState({
    productBarcode: '',
    name: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    status: 'ACTIVE',
    productUrl: '',
    eligibleForReturn: true
  });

  // ── Supplier Pricing State ─────────────────────────────────────────────────
  const [pricing, setPricing] = useState({
    costPrice: '',
    packagingCost: '',
    shippingCost: '',
    profitMargin: '',
    mrp: '',
    sellingPrice: '',
    discount: '',
    gstRate: '18',
    unitSize: '',
    unitLabel: ''
  });
  const [pricingEnabled, setPricingEnabled] = useState(true); // ON by default

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (editingProduct) {
        setProduct(editingProduct);
        if (editingProduct.categoryId) {
          fetchCategoryAttributesFromBackend(editingProduct.categoryId);
        }
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingProduct]);

  const loadCategories = async () => {
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
      setCategories(catsRes.ok ? await catsRes.json() : []);
      setSubcategories(subsRes.ok ? await subsRes.json() : []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const resetForm = () => {
    setProduct({
      productBarcode: '', // admin will type their own barcode
      name: '',
      description: '',
      categoryId: '',
      subcategoryId: '',
      status: 'ACTIVE',
      productUrl: '',
      eligibleForReturn: true
    });
    setSelectedTemplate(null);
    setShowTemplates(false);
    setAttributes([{ name: '', value: '' }]);
    setDynamicCategoryAttributes([]);
    // Reset pricing
    setPricing({
      costPrice: '', packagingCost: '', shippingCost: '', profitMargin: '',
      mrp: '', sellingPrice: '', discount: '', gstRate: '18', unitSize: '', unitLabel: ''
    });
    setPricingEnabled(true);
  };

  const getProductTemplates = (categoryId) => {
    const templates = {
      1: [
        { id: 'smartphone', name: 'Premium Smartphone', icon: <Smartphone size={24} />, color: '#4F46E5', sample: { name: 'Galaxy Pro Max 256GB', description: 'Premium flagship smartphone with advanced camera system, powerful processor, and all-day battery life. Features include 5G connectivity, wireless charging, and premium build quality.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600' } },
        { id: 'laptop', name: 'Professional Laptop', icon: <Package size={24} />, color: '#059669', sample: { name: 'UltraBook Pro 15" i7', description: 'High-performance laptop designed for professionals. Features Intel i7 processor, 16GB RAM, 512GB SSD, and premium aluminum build. Perfect for work, creativity, and productivity.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600' } },
        { id: 'headphones', name: 'Wireless Headphones', icon: <Lightbulb size={24} />, color: '#DC2626', sample: { name: 'AirPods Pro Max Wireless', description: 'Premium wireless headphones with active noise cancellation, spatial audio, and premium comfort. Up to 30 hours battery life with quick charge support.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600' } }
      ],
      2: [
        { id: 'sofa', name: 'Premium Sofa', icon: <Sofa size={24} />, color: '#7C2D12', sample: { name: 'Luxury 3-Seater Velvet Sofa', description: 'Elegant 3-seater sofa with premium velvet upholstery and solid hardwood frame. Features deep comfortable seating, brass-finished legs, and contemporary design perfect for modern living spaces.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600' } },
        { id: 'dining-table', name: 'Dining Table', icon: <Package size={24} />, color: '#92400E', sample: { name: 'Solid Oak Dining Table 6-Seater', description: 'Handcrafted solid oak dining table that seats 6-8 people comfortably. Features natural wood grain, durable construction, and timeless design. Perfect centerpiece for family gatherings.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1617103996702-96ff29b1c467?w=600' } },
        { id: 'office-chair', name: 'Office Chair', icon: <Sparkles size={24} />, color: '#1F2937', sample: { name: 'Ergonomic Executive Office Chair', description: 'Premium ergonomic office chair with lumbar support, adjustable height, and breathable mesh back. Designed for all-day comfort and productivity with 360° swivel and smooth rolling casters.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600' } }
      ],
      3: [
        { id: 'tshirt', name: 'Premium T-Shirt', icon: <Shirt size={24} />, color: '#7C3AED', sample: { name: 'Premium Cotton Crew Neck T-Shirt', description: '100% premium cotton t-shirt with comfortable fit and superior quality. Features reinforced seams, pre-shrunk fabric, and available in multiple colors. Perfect for casual wear and layering.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600' } },
        { id: 'jeans', name: 'Designer Jeans', icon: <Package size={24} />, color: '#1E40AF', sample: { name: 'Slim Fit Dark Wash Jeans', description: 'Premium denim jeans with slim fit design and dark wash finish. Made from high-quality cotton blend with stretch for comfort. Features classic 5-pocket styling and durable construction.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600' } },
        { id: 'jacket', name: 'Casual Jacket', icon: <Sparkles size={24} />, color: '#059669', sample: { name: 'Lightweight Bomber Jacket', description: 'Stylish bomber jacket perfect for casual outings. Features lightweight fabric, comfortable fit, and modern design. Available in multiple colors with ribbed cuffs and hem.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600' } }
      ],
      4: [
        { id: 'fiction', name: 'Fiction Novel', icon: <Book size={24} />, color: '#DC2626', sample: { name: 'The Midnight Chronicles', description: 'A captivating fiction novel that takes readers on an extraordinary journey through mystery and adventure. Featuring compelling characters and an engaging plot that keeps you turning pages.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600' } },
        { id: 'textbook', name: 'Educational Textbook', icon: <Lightbulb size={24} />, color: '#0891B2', sample: { name: 'Advanced Computer Science Fundamentals', description: 'Comprehensive textbook covering advanced computer science concepts. Includes practical examples, exercises, and real-world applications. Perfect for students and professionals.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600' } }
      ],
      5: [
        { id: 'running-shoes', name: 'Running Shoes', icon: <Dumbbell size={24} />, color: '#EA580C', sample: { name: 'Professional Running Shoes', description: 'High-performance running shoes designed for comfort and durability. Features advanced cushioning, breathable mesh upper, and superior grip. Perfect for daily runs and athletic training.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600' } },
        { id: 'yoga-mat', name: 'Yoga Equipment', icon: <Sparkles size={24} />, color: '#7C3AED', sample: { name: 'Premium Yoga Mat with Alignment Lines', description: 'Professional-grade yoga mat with superior grip and cushioning. Features alignment lines for proper positioning, eco-friendly materials, and easy-clean surface. Perfect for all yoga practices.', productBarcode: generateBarcode(), productUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600' } }
      ]
    };
    return templates[categoryId] || [];
  };

  const applyTemplate = (template) => {
    setProduct(prev => ({ ...prev, ...template.sample }));
    setSelectedTemplate(template);
    setShowTemplates(false);
  };

  const fetchCategoryAttributesFromBackend = async (categoryId) => {
    if (!categoryId) return;
    setLoadingAttributes(true);
    try {
      const attrs = await imsService.products.getCategoryAttributes(categoryId);
      setDynamicCategoryAttributes(Array.isArray(attrs) ? attrs : []);
    } catch (err) {
      console.warn('Could not fetch category attributes from backend:', err);
      setDynamicCategoryAttributes([]);
    } finally {
      setLoadingAttributes(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'categoryId') {
      setAttributes([{ name: '', value: '' }]);
      setDynamicCategoryAttributes([]);
      if (value) fetchCategoryAttributesFromBackend(value);
    }
  };

  const handleAttributeChange = (index, field, value) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const addAttribute = () => setAttributes([...attributes, { name: '', value: '' }]);

  const removeAttribute = (index) => {
    if (attributes.length > 1) setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleImageUpload = (imageUrl) => {
    setProduct(prev => ({ ...prev, productUrl: imageUrl }));
  };

  // ── Pricing field change handler ───────────────────────────────────────────
  const handlePricingChange = (e) => {
    const { name, value } = e.target;
    setPricing(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-calculate sellingPrice when cost breakdown fields change
      const breakdownFields = ['costPrice', 'packagingCost', 'shippingCost', 'profitMargin', 'gstRate'];
      if (breakdownFields.includes(name)) {
        const computed = calcSellingPrice(
          name === 'costPrice'     ? value : updated.costPrice,
          name === 'packagingCost' ? value : updated.packagingCost,
          name === 'shippingCost'  ? value : updated.shippingCost,
          name === 'profitMargin'  ? value : updated.profitMargin,
          name === 'gstRate'       ? value : updated.gstRate,
        );
        if (computed) {
          updated.sellingPrice = computed;
          // Auto-calculate discount from MRP vs computed sellingPrice
          if (updated.mrp) updated.discount = calcDiscount(updated.mrp, computed);
        }
      }

      // Auto-calculate discount when MRP or sellingPrice changes manually
      if (name === 'mrp' || name === 'sellingPrice') {
        const d = calcDiscount(
          name === 'mrp' ? value : updated.mrp,
          name === 'sellingPrice' ? value : updated.sellingPrice
        );
        if (d) updated.discount = d;
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product.productBarcode || !product.name || !product.description || !product.categoryId || !product.subcategoryId) {
      alert('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...product,
        categoryId: parseInt(product.categoryId),
        subcategoryId: parseInt(product.subcategoryId)
      };
      let productId;
      if (editingProduct) {
        await imsService.products.updateProduct(editingProduct.id, payload);
        productId = editingProduct.productId;
        alert('Product updated successfully!');
      } else {
        const newProduct = await imsService.products.createProduct(payload);
        productId = newProduct.productId;
        alert('Product added successfully!');
      }
      const validAttributes = attributes.filter(attr => attr.name && attr.value);
      if (validAttributes.length > 0 && productId) {
        for (const attr of validAttributes) {
          await fetch('http://localhost:9999/api/product-attributes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, attributeName: attr.name, attributeValue: attr.value })
          });
        }
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const categoryTemplates = product.categoryId ? getProductTemplates(parseInt(product.categoryId)) : [];
  const selectedCategory = categories.find(cat => cat.id.toString() === product.categoryId);

  return (
    <div className="modal-overlay">
      <div className="modal-content professional-product-form" style={{ width: '900px', maxWidth: '95vw' }}>
        <div className="modal-header">
          <div className="header-content">
            <div className="header-icon"><Package size={24} /></div>
            <div>
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <p className="header-subtitle">
                {editingProduct ? 'Update product information' : 'Create a new product with professional templates'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="professional-form">

          {/* Category Selection */}
          <div className="form-section">
            <div className="section-header">
              <h4 className="section-title">📂 Product Category</h4>
              <p className="section-subtitle">Choose the category to see professional templates</p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select name="categoryId" value={product.categoryId} onChange={handleChange} required className="form-select">
                  <option value="">Select Category *</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subcategory *</label>
                <select name="subcategoryId" value={product.subcategoryId} onChange={handleChange} required className="form-select" disabled={!product.categoryId}>
                  <option value="">Select Subcategory *</option>
                  {subcategories.filter(sub => sub.categoryId === parseInt(product.categoryId)).map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          {categoryTemplates.length > 0 && !editingProduct && (
            <div className="form-section">
              <div className="section-header">
                <h4 className="section-title">✨ Professional Templates</h4>
                <p className="section-subtitle">Choose from {selectedCategory?.name} templates or create from scratch</p>
                <button type="button" onClick={() => setShowTemplates(!showTemplates)} className="template-toggle-btn">
                  {showTemplates ? 'Hide Templates' : 'Show Templates'}
                </button>
              </div>
              {showTemplates && (
                <div className="templates-grid">
                  {categoryTemplates.map(template => (
                    <div key={template.id} className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`} onClick={() => applyTemplate(template)}>
                      <div className="template-header">
                        <div className="template-icon" style={{ backgroundColor: template.color }}>{template.icon}</div>
                        <h5 className="template-name">{template.name}</h5>
                      </div>
                      <div className="template-preview">
                        <p className="template-sample-name">{template.sample.name}</p>
                        <p className="template-sample-desc">{template.sample.description.substring(0, 80)}...</p>
                      </div>
                      <div className="template-footer"><span className="template-badge">Sample Data</span></div>
                    </div>
                  ))}
                  <div className="template-card custom-template">
                    <div className="template-header">
                      <div className="template-icon custom-icon"><Sparkles size={20} /></div>
                      <h5 className="template-name">Custom Product</h5>
                    </div>
                    <div className="template-preview">
                      <p className="template-sample-name">Create from scratch</p>
                      <p className="template-sample-desc">Start with empty fields and create your own product</p>
                    </div>
                    <div className="template-footer"><span className="template-badge custom-badge">Custom</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product Information */}
          <div className="form-section">
            <div className="section-header">
              <h4 className="section-title">📝 Product Information</h4>
              {selectedTemplate && (
                <div className="applied-template">
                  <span className="template-indicator">✨ Using: {selectedTemplate.name} Template</span>
                </div>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input type="text" name="name" placeholder="Enter product name" value={product.name} onChange={handleChange} required className="form-input" />
              </div>

              {/* Barcode with auto-generate */}
              <div className="form-group">
                <label className="form-label">Product Barcode *</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    name="productBarcode"
                    placeholder="e.g. BED-01, LAPTOP-01, SHIRT-RED-M"
                    value={product.productBarcode}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                  {!editingProduct && (
                    <button
                      type="button"
                      onClick={() => setProduct(prev => ({ ...prev, productBarcode: generateBarcode() }))}
                      className="btn-secondary"
                      title="Auto-generate barcode"
                      style={{ whiteSpace: 'nowrap', padding: '8px 12px', fontSize: '13px', background: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '8px', cursor: 'pointer', color: '#4338ca', fontWeight: 500 }}
                    >
                      🔄 Auto
                    </button>
                  )}
                </div>
                <small style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>
                  Type your own barcode (e.g. <strong>BED-01</strong>) or click "Auto" to generate one. This same barcode is used in Inventory.
                </small>
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Product Description *</label>
              <textarea name="description" placeholder="Describe your product features, benefits, and specifications" value={product.description} onChange={handleChange} required rows={4} className="form-textarea" />
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <ImageUpload onImageUpload={handleImageUpload} currentImage={product.productUrl} />
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Or Enter Image URL Manually</label>
              <input type="url" name="productUrl" placeholder="https://example.com/image.jpg (optional if uploaded above)" value={product.productUrl} onChange={handleChange} className="form-input" />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" value={product.status} onChange={handleChange} className="form-select">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" name="eligibleForReturn" checked={product.eligibleForReturn} onChange={handleChange} className="form-checkbox" />
                <span className="checkbox-text">Eligible for Return</span>
              </label>
            </div>
          </div>

          {/* Attributes Section */}
          {product.categoryId && (
            <div className="form-section">
              <div className="section-header">
                <h4 className="section-title">🏷️ Product Attributes</h4>
                <p className="section-subtitle">
                  {loadingAttributes ? 'Loading attributes from backend...' : `Add specific attributes for this category (${dynamicCategoryAttributes.length} available)`}
                </p>
              </div>
              <div className="attributes-container">
                {attributes.map((attribute, index) => {
                  const availableAttributes = dynamicCategoryAttributes.map(a => a.attributeName || a);
                  return (
                    <div key={index} className="attribute-row">
                      <div className="form-group">
                        <label className="form-label">Attribute Type</label>
                        <select value={attribute.name} onChange={(e) => { handleAttributeChange(index, 'name', e.target.value); handleAttributeChange(index, 'value', ''); }} className="form-select" disabled={loadingAttributes}>
                          <option value="">{loadingAttributes ? 'Loading...' : 'Select Attribute Type'}</option>
                          {availableAttributes.map(attr => <option key={attr} value={attr}>{attr}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Attribute Value</label>
                        <input type="text" placeholder="Enter value" value={attribute.value} onChange={(e) => handleAttributeChange(index, 'value', e.target.value)} className="form-input" />
                      </div>
                      {attributes.length > 1 && (
                        <button type="button" onClick={() => removeAttribute(index)} className="btn-remove-attr" title="Remove attribute"><X size={16} /></button>
                      )}
                    </div>
                  );
                })}
                <button type="button" onClick={addAttribute} className="btn-add-attr">+ Add More Attributes</button>
                {dynamicCategoryAttributes.length > 0 && (
                  <div className="quick-attributes">
                    <h5 style={{ margin: '20px 0 10px 0', color: '#666' }}>Quick Add Attributes:</h5>
                    <div className="quick-attr-buttons">
                      {dynamicCategoryAttributes.slice(0, 6).map(attr => {
                        const attrName = attr.attributeName || attr;
                        const isAlreadyAdded = attributes.some(a => a.name === attrName);
                        return (
                          <button key={attrName} type="button" disabled={isAlreadyAdded}
                            onClick={() => setAttributes([...attributes, { name: attrName, value: '' }])}
                            className={`quick-attr-btn ${isAlreadyAdded ? 'disabled' : ''}`}
                            style={{ padding: '6px 12px', margin: '4px', border: '1px solid #ddd', borderRadius: '20px', background: isAlreadyAdded ? '#f8f9fa' : '#fff', color: isAlreadyAdded ? '#999' : '#333', cursor: isAlreadyAdded ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                            {isAlreadyAdded ? '✓ ' : '+ '}{attrName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Preview */}
          {product.productUrl && (
            <div className="form-section">
              <div className="section-header"><h4 className="section-title">🖼️ Image Preview</h4></div>
              <div className="image-preview">
                <img src={product.productUrl} alt="Product preview" className="preview-image" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
