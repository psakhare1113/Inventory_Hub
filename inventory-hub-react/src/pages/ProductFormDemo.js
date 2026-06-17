import React, { useState } from 'react';
import ProductForm from '../components/ProductForm';

const ProductFormDemo = () => {
  // Sample existing products for duplicate validation
  const [existingProducts] = useState([
    {
      id: 1,
      name: 'Nike Air Max Shoes',
      sku: 'NIK-AM-001',
      description: 'Premium running shoes with air cushioning technology'
    },
    {
      id: 2,
      name: 'Adidas Ultraboost',
      sku: 'ADI-UB-002',
      description: 'High-performance running shoes with boost technology'
    },
    {
      id: 3,
      name: 'Biba Anarkali Kurta Set',
      sku: 'BIB-AK-003',
      description: 'Traditional Indian ethnic wear for women'
    }
  ]);

  const handleProductSubmit = async (productData) => {
    console.log('Product submitted:', productData);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert('Product saved successfully!');
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
            Professional Product Management System
          </h1>
          <p style={{ fontSize: '18px', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
            Experience intelligent product validation, auto-formatting, and professional guidance 
            similar to Amazon, Myntra, and Flipkart admin panels.
          </p>
        </div>

        <div style={{ 
          backgroundColor: '#ffffff', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '32px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            🚀 Key Features Demonstrated
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                ✨ Smart Formatting
              </h3>
              <ul style={{ color: '#6b7280', fontSize: '14px', paddingLeft: '20px' }}>
                <li>Auto title case conversion</li>
                <li>Real-time formatting suggestions</li>
                <li>Professional name standardization</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                🔍 Intelligent Validation
              </h3>
              <ul style={{ color: '#6b7280', fontSize: '14px', paddingLeft: '20px' }}>
                <li>Case-insensitive duplicate detection</li>
                <li>Price relationship validation</li>
                <li>Professional description templates</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                📸 Advanced Image Handling
              </h3>
              <ul style={{ color: '#6b7280', fontSize: '14px', paddingLeft: '20px' }}>
                <li>Drag & drop image upload</li>
                <li>Format and size validation</li>
                <li>Real-time preview system</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#fef3c7', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '24px',
          border: '1px solid #f59e0b'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
            💡 Try These Examples
          </h3>
          <div style={{ color: '#92400e', fontSize: '14px' }}>
            <p><strong>Product Names:</strong> Try typing "biba kurta set", "NIKE shoes", or "adidas ultraboost" to see auto-formatting</p>
            <p><strong>Duplicates:</strong> Try "Nike Air Max Shoes" or "biba anarkali kurta set" to see duplicate detection</p>
            <p><strong>Pricing:</strong> Set selling price lower than cost price to see validation</p>
          </div>
        </div>

        <ProductForm
          existingProducts={existingProducts}
          onSubmit={handleProductSubmit}
        />
      </div>
    </div>
  );
};

export default ProductFormDemo;