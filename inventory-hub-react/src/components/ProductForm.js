import React, { useState, useEffect } from 'react';
import { ProductValidator } from '../utils/productValidation';
import ValidationMessage from './ValidationMessage';
import FormField from './FormField';
import ImageUpload from './ImageUpload';
import './ProductForm.css';

const ProductForm = ({ existingProducts = [], onSubmit, initialData = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    costPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    thresholdQuantity: '',
    category: '',
    brand: '',
    images: []
  });

  const [validation, setValidation] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const validateField = (field, value) => {
    let result = { isValid: true, errors: [] };

    switch (field) {
      case 'name':
        result = ProductValidator.validateProductName(value, existingProducts);
        // Generate suggestions
        const nameSuggestions = ProductValidator.getNameSuggestions(value);
        setSuggestions(nameSuggestions);
        break;
      case 'description':
        result = ProductValidator.validateDescription(value);
        break;
      case 'sku':
        result = ProductValidator.validateSKU(value, existingProducts);
        break;
      case 'prices':
        result = ProductValidator.validatePrices(
          parseFloat(formData.costPrice), 
          parseFloat(formData.sellingPrice)
        );
        break;
      case 'stock':
        result = ProductValidator.validateStock(
          parseInt(formData.stockQuantity), 
          parseInt(formData.thresholdQuantity)
        );
        break;
      case 'images':
        result = ProductValidator.validateImages(value);
        break;
      default:
        break;
    }

    setValidation(prev => ({
      ...prev,
      [field]: result
    }));

    return result;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Real-time validation
    if (field === 'name') {
      const nameValidation = validateField('name', value);
      if (nameValidation.formatted && nameValidation.formatted !== value) {
        // Auto-format after a short delay
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            name: nameValidation.formatted
          }));
        }, 1000);
      }
    } else if (field === 'sku') {
      const skuValidation = validateField('sku', value);
      if (skuValidation.formatted && skuValidation.formatted !== value) {
        setFormData(prev => ({
          ...prev,
          sku: skuValidation.formatted
        }));
      }
    } else {
      validateField(field, value);
    }

    // Validate prices together
    if (field === 'costPrice' || field === 'sellingPrice') {
      setTimeout(() => validateField('prices'), 100);
    }

    // Validate stock together
    if (field === 'stockQuantity' || field === 'thresholdQuantity') {
      setTimeout(() => validateField('stock'), 100);
    }
  };

  const applySuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      name: suggestion.text
    }));
    setSuggestions([]);
    validateField('name', suggestion.text);
  };

  const generateDescriptionTemplate = () => {
    const template = ProductValidator.generateDescriptionTemplate(
      formData.brand, 
      formData.category
    );
    setFormData(prev => ({
      ...prev,
      description: template
    }));
    validateField('description', template);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const validations = {
      name: validateField('name', formData.name),
      description: validateField('description', formData.description),
      sku: validateField('sku', formData.sku),
      prices: validateField('prices'),
      stock: validateField('stock'),
      images: validateField('images', formData.images)
    };

    const isFormValid = Object.values(validations).every(v => v.isValid);

    if (isFormValid) {
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }

    setIsSubmitting(false);
  };

  return (
    <div className="product-form-container">
      <div className="form-header">
        <h2>{initialData ? 'Edit Product' : 'Add New Product'}</h2>
        <div className="form-guidance">
          <h4>Product Entry Guidelines</h4>
          <ul>
            <li>Use proper title case for product names (e.g., "Nike Air Max Shoes")</li>
            <li>Include brand, material, and key features in descriptions</li>
            <li>Ensure SKU is unique across all products</li>
            <li>Selling price must be higher than cost price</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          
          <FormField
            label="Product Name *"
            value={formData.name}
            onChange={(value) => handleInputChange('name', value)}
            validation={validation.name}
            placeholder="e.g., Nike Air Max Running Shoes"
            suggestions={suggestions}
            onApplySuggestion={applySuggestion}
          />

          <FormField
            label="SKU *"
            value={formData.sku}
            onChange={(value) => handleInputChange('sku', value)}
            validation={validation.sku}
            placeholder="e.g., NIK-AM-001"
          />

          <div className="form-row">
            <FormField
              label="Category *"
              type="select"
              value={formData.category}
              onChange={(value) => handleInputChange('category', value)}
              options={[
                { value: '', label: 'Select Category' },
                { value: 'clothing', label: 'Clothing' },
                { value: 'footwear', label: 'Footwear' },
                { value: 'accessories', label: 'Accessories' },
                { value: 'electronics', label: 'Electronics' }
              ]}
            />

            <FormField
              label="Brand"
              value={formData.brand}
              onChange={(value) => handleInputChange('brand', value)}
              placeholder="e.g., Nike, Adidas, Biba"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Description</h3>
          
          <div className="description-controls">
            <button
              type="button"
              onClick={generateDescriptionTemplate}
              className="template-btn"
            >
              Generate Template
            </button>
          </div>

          <FormField
            label="Product Description *"
            type="textarea"
            value={formData.description}
            onChange={(value) => handleInputChange('description', value)}
            validation={validation.description}
            placeholder="Describe your product professionally with brand, material, features, and usage..."
            rows={8}
          />
        </div>

        <div className="form-section">
          <h3>Pricing & Stock</h3>
          
          <div className="form-row">
            <FormField
              label="Cost Price *"
              type="number"
              value={formData.costPrice}
              onChange={(value) => handleInputChange('costPrice', value)}
              validation={validation.prices}
              placeholder="0.00"
              min="0"
              step="0.01"
            />

            <FormField
              label="Selling Price *"
              type="number"
              value={formData.sellingPrice}
              onChange={(value) => handleInputChange('sellingPrice', value)}
              validation={validation.prices}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-row">
            <FormField
              label="Stock Quantity *"
              type="number"
              value={formData.stockQuantity}
              onChange={(value) => handleInputChange('stockQuantity', value)}
              validation={validation.stock}
              placeholder="0"
              min="0"
            />

            <FormField
              label="Low Stock Threshold *"
              type="number"
              value={formData.thresholdQuantity}
              onChange={(value) => handleInputChange('thresholdQuantity', value)}
              validation={validation.stock}
              placeholder="5"
              min="1"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Product Images</h3>
          
          <ImageUpload
            images={formData.images}
            onChange={(images) => handleInputChange('images', images)}
            validation={validation.images}
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className="submit-btn"
          >
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Product' : 'Add Product')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;