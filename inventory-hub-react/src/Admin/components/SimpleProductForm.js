import React, { useState, useEffect } from 'react';
import { categoriesApi, subcategoriesApi } from '../../services/apiService';
import { imsService } from '../../services/imsApi';
import '../css/SimpleProductForm.css';

export default function SimpleProductForm({ isOpen, onClose, editingProduct, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attributes, setAttributes] = useState([{ name: '', value: '' }]);
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

  // Category-wise attributes mapping
  const categoryAttributes = {
    1: { // Electronics
      name: 'Electronics',
      attributes: {
        'RAM': ['4GB', '8GB', '16GB', '32GB', '64GB', '128GB'],
        'Storage': ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'],
        'Processor': ['Intel i3', 'Intel i5', 'Intel i7', 'AMD Ryzen 3', 'AMD Ryzen 5', 'Snapdragon 888'],
        'Display Size': ['5.5"', '6.1"', '6.7"', '13"', '15"', '17"', '21"', '24"', '27"'],
        'Battery': ['3000mAh', '4000mAh', '5000mAh', 'Up to 8 hours', 'Up to 12 hours'],
        'Camera': ['12MP', '48MP', '64MP', '108MP', 'Triple Camera', 'Dual Camera'],
        'Brand': ['Apple', 'Samsung', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Sony', 'LG'],
        'Color': ['Black', 'White', 'Silver', 'Gold', 'Blue', 'Red']
      }
    },
    2: { // Furniture
      name: 'Furniture',
      attributes: {
        'Material': ['Wood', 'Metal', 'Plastic', 'Glass', 'Leather', 'Fabric', 'Bamboo'],
        'Dimensions': ['Small', 'Medium', 'Large', 'Custom'],
        'Weight': ['Under 10kg', '10-25kg', '25-50kg', 'Over 50kg'],
        'Color': ['Brown', 'Black', 'White', 'Gray', 'Beige', 'Natural Wood'],
        'Assembly Required': ['Yes', 'No', 'Partial'],
        'Warranty': ['1 Year', '2 Years', '5 Years', 'Lifetime'],
        'Style': ['Modern', 'Traditional', 'Contemporary', 'Rustic', 'Industrial'],
        'Finish': ['Matte', 'Glossy', 'Textured', 'Natural']
      }
    },
    3: { // Clothing
      name: 'Clothing',
      attributes: {
        'Size': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38'],
        'Color': ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Purple'],
        'Material': ['Cotton', 'Polyester', 'Wool', 'Silk', 'Denim', 'Leather', 'Linen'],
        'Brand': ['Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Levi\'s', 'Gap'],
        'Fit Type': ['Slim Fit', 'Regular Fit', 'Loose Fit', 'Skinny', 'Straight'],
        'Care Instructions': ['Machine Wash', 'Hand Wash', 'Dry Clean Only', 'Air Dry']
      }
    },
    4: { // Books
      name: 'Books',
      attributes: {
        'Author': ['Custom Author'],
        'Publisher': ['Penguin', 'HarperCollins', 'Random House', 'Scholastic', 'McGraw Hill'],
        'Pages': ['Under 100', '100-300', '300-500', '500+'],
        'Language': ['English', 'Spanish', 'French', 'German', 'Hindi', 'Chinese'],
        'Genre': ['Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Biography'],
        'Edition': ['1st Edition', '2nd Edition', '3rd Edition', 'Latest Edition']
      }
    },
    5: { // Sports
      name: 'Sports',
      attributes: {
        'Size': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '6', '7', '8', '9', '10', '11', '12'],
        'Weight': ['Under 1kg', '1-5kg', '5-10kg', 'Over 10kg'],
        'Material': ['Rubber', 'Leather', 'Synthetic', 'Cotton', 'Polyester', 'Nylon'],
        'Brand': ['Nike', 'Adidas', 'Puma', 'Reebok', 'Under Armour', 'Wilson'],
        'Sport Type': ['Running', 'Basketball', 'Football', 'Tennis', 'Gym', 'Yoga'],
        'Color': ['Black', 'White', 'Red', 'Blue', 'Green', 'Orange', 'Multi-Color']
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (editingProduct) {
        setProduct(editingProduct);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingProduct]);

  const loadCategories = async () => {
    try {
      const [cats, subs] = await Promise.all([
        categoriesApi.getAll(),
        subcategoriesApi.getAll()
      ]);
      setCategories(cats || []);
      setSubcategories(subs || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const resetForm = () => {
    setProduct({
      productBarcode: '',
      name: '',
      description: '',
      categoryId: '',
      subcategoryId: '',
      status: 'ACTIVE',
      productUrl: '',
      eligibleForReturn: true
    });
    setAttributes([{ name: '', value: '' }]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Reset attributes when category changes
    if (name === 'categoryId' && value) {
      setAttributes([{ name: '', value: '' }]);
    }
  };

  const handleAttributeChange = (index, field, value) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const addAttribute = () => {
    setAttributes([...attributes, { name: '', value: '' }]);
  };

  const removeAttribute = (index) => {
    if (attributes.length > 1) {
      setAttributes(attributes.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!product.productBarcode || !product.categoryId || !product.subcategoryId) {
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
        await imsService.products.updateProduct(editingProduct.productId, payload);
        productId = editingProduct.productId;
        alert('Product updated successfully!');
      } else {
        const newProduct = await imsService.products.createProduct(payload);
        productId = newProduct.productId;
        alert('Product added successfully!');
      }
      
      // Add attributes if any
      const validAttributes = attributes.filter(attr => attr.name && attr.value);
      if (validAttributes.length > 0 && productId) {
        for (const attr of validAttributes) {
          try {
            await imsService.products.addProductAttribute(productId, {
              attributeName: attr.name,
              attributeValue: attr.value
            });
          } catch (attrErr) {
            console.warn('Failed to add attribute:', attrErr);
          }
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

  const categoryData = categoryAttributes[product.categoryId];
  const availableAttributes = categoryData ? Object.keys(categoryData.attributes) : [];

  return (
    <div className="modal-overlay">
      <div className="product-form-modal" style={{ width: '500px', maxWidth: '90vw' }}>
        <div className="modal-header">
          <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
          <button 
            className="close-btn"
            onClick={onClose}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-section">
            <h4>Product Information</h4>
            
            <div className="form-row">
              <input
                type="text"
                name="name"
                placeholder="Product Name *"
                value={product.name}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="productBarcode"
                placeholder="Product Barcode *"
                value={product.productBarcode}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <select
                name="categoryId"
                value={product.categoryId}
                onChange={handleChange}
                required
              >
                <option value="">Select Category *</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                name="subcategoryId"
                value={product.subcategoryId}
                onChange={handleChange}
                required
                disabled={!product.categoryId}
              >
                <option value="">Select Subcategory *</option>
                {subcategories
                  .filter(sub => sub.categoryId === parseInt(product.categoryId))
                  .map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
              </select>
            </div>

            <div className="form-row">
              <textarea
                name="description"
                placeholder="Product Description"
                value={product.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="form-row">
              <input
                type="url"
                name="productUrl"
                placeholder="Product Image URL"
                value={product.productUrl}
                onChange={handleChange}
              />
              <select
                name="status"
                value={product.status}
                onChange={handleChange}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  name="eligibleForReturn"
                  checked={product.eligibleForReturn}
                  onChange={handleChange}
                />
                Eligible for Return
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-submit"
            >
              {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}