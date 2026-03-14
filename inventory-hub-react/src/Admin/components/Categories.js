import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, FolderOpen } from 'lucide-react';
import { categoriesApi, subcategoriesApi } from '../../services/apiService';
import '../css/Categories.css';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [sliderCategories, setSliderCategories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [parentId, setParentId] = useState('');
  const [viewType, setViewType] = useState('categories');
  const [editingItem, setEditingItem] = useState(null);
  const handleEditCategory = (item) => {
    setName(item.name);
    setDescription(item.description || '');
    setImageUrl(item.imageUrl || '');
    setParentId(item.categoryId || '');
    setEditingItem(item);
    setIsOpen(true);
  };

  const updateCategory = async () => {
    if (!name.trim()) {
      alert('Please enter category name');
      return;
    }

    try {
      if (editingItem.categoryId) {
        await subcategoriesApi.update(editingItem.id, parseInt(parentId), name.trim());
      } else {
        const response = await fetch(`http://localhost:9999/api/categories/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), imageUrl: imageUrl.trim() })
        });
        if (!response.ok) throw new Error('Update failed');
      }
      await fetchCategories();
      setIsOpen(false);
      setEditingItem(null);
      setName('');
      setDescription('');
      setImageUrl('');
      setParentId('');
      alert('Updated successfully!');
    } catch (error) {
      console.error('Error updating:', error);
      alert('Error updating. Please try again.');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const [cats, subs] = await Promise.all([
        categoriesApi.getAll(),
        subcategoriesApi.getAll()
      ]);
      // Sort categories by ID to show newest first
      const sortedCats = cats.sort((a, b) => b.id - a.id);
      const sortedSubs = subs.sort((a, b) => b.id - a.id);
      
      setCategories(sortedCats);
      setSliderCategories(sortedCats);
      setSubCategories(sortedSubs);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async () => {
    if (!name.trim()) {
      alert('Please enter category name');
      return;
    }

    try {
      let result;
      if (parentId) {
        result = await subcategoriesApi.create(parseInt(parentId), name.trim());
        alert('Subcategory created successfully!');
      } else {
        const response = await fetch('http://localhost:9999/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), imageUrl: imageUrl.trim() })
        });
        if (!response.ok) throw new Error('Create failed');
        result = await response.json();
        alert('Category created successfully!');
      }
      
      await fetchCategories();
      setIsOpen(false);
      setName('');
      setImageUrl('');
      setParentId('');
      
      console.log('Category created:', result);
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Error creating category. Please try again.');
    }
  };

  const deleteCategory = async (id) => {
    const itemType = viewType === 'categories' ? 'category' : 'subcategory';
    if (window.confirm(`Are you sure you want to delete this ${itemType}?`)) {
      try {
        if (viewType === 'categories') {
          await categoriesApi.delete(id);
        } else {
          await subcategoriesApi.delete(id);
        }
        await fetchCategories();
        alert(`${itemType} deleted successfully!`);
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting. Please try again.');
      }
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % sliderCategories.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + sliderCategories.length) % sliderCategories.length);
  };

  const exportToPDF = () => {
    const printContent = `
      <h2>Categories List Report</h2>
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Type</th>
          </tr>
        </thead>
        <tbody>
          ${filteredCategories.map(category => `
            <tr>
              <td>${category.id}</td>
              <td>${category.name}</td>
              <td>${viewType === 'categories' ? 'Main Category' : getCategoryName(category.categoryId)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const exportToExcel = () => {
    console.log('Export to Excel functionality');
  };

  const currentData = viewType === 'categories' ? categories : subCategories;
  const filteredCategories = currentData.filter(category =>
    category.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin categories-page">
      <div className="categories-header">
        <h2>Categories</h2>
        <button className="add-category-btn" onClick={() => setIsOpen(true)}>
          <Plus size={20} />
          Add Category
        </button>
      </div>

      <div className="categories-card">
        <div className="categories-card-header">
          <h3>Product Categories</h3>
        </div>

        <div className="categories-search">
          <div className="categories-controls">
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewType === 'categories' ? 'active' : ''}`}
                onClick={() => setViewType('categories')}
              >
                Main Categories ({categories.length})
              </button>
              <button 
                className={`toggle-btn ${viewType === 'subcategories' ? 'active' : ''}`}
                onClick={() => setViewType('subcategories')}
              >
                Subcategories ({subCategories.length})
              </button>
            </div>
            <div className="categories-export-buttons">
              <button className="categories-pdf-btn" onClick={exportToPDF}>
                📄 PDF
              </button>
              <button className="categories-excel-btn" onClick={exportToExcel}>
                📊 Excel
              </button>
            </div>
          </div>
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="categories-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Name</th>
              <th>{viewType === 'categories' ? 'Type' : 'Parent Category'}</th>
              <th className="category-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  {viewType === 'categories' && item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#e5e7eb' }}></div>
                  )}
                </td>
                <td>{item.name}</td>
                <td>
                  {viewType === 'categories' ? 
                    'Main Category' : 
                    getCategoryName(item.categoryId)
                  }
                </td>
                <td className="category-action-col">
                  <div className="category-action-buttons">
                    <Edit 
                      className="category-edit-icon" 
                      size={16} 
                      onClick={() => handleEditCategory(item)}
                      style={{cursor: 'pointer', color: '#007bff', marginRight: '10px'}}
                      title="Edit"
                    />
                    <Trash2 
                      className="category-delete-icon" 
                      size={16} 
                      onClick={() => deleteCategory(item.id)}
                      style={{cursor: 'pointer', color: '#dc3545'}}
                      title="Delete"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Category Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add {viewType === 'categories' ? 'Category' : 'Subcategory'}</h3>
              <button className="modal-close" onClick={() => setIsOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Parent Category</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">Select Parent Category (Optional)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Category Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
              {!parentId && (
                <div className="form-group">
                  <label>Image URL</label>
                  <input 
                    type="text" 
                    value={imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Enter image URL"
                  />
                  {imageUrl && (
                    <div style={{ marginTop: '10px' }}>
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>
              )}
              <button 
                className="create-btn" 
                onClick={editingItem ? updateCategory : createCategory}
                disabled={!name.trim()}
                style={{
                  backgroundColor: name.trim() ? '#007bff' : '#ccc',
                  cursor: name.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}