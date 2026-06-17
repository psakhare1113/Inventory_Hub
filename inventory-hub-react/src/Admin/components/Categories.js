import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ChevronRight, ChevronDown, FolderOpen, Folder, Tag } from 'lucide-react';
import { categoriesApi } from '../../services/apiService';
import { categoryFieldTemplates } from '../../services/categoryFieldTemplates';
import { imsService } from '../../services/imsApi';
import '../css/Categories.css';

const BASE_URL = 'http://localhost:9999';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subSubCategories, setSubSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubCategories, setExpandedSubCategories] = useState({});

  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingItem, setEditingItem] = useState(null);
  const [editingType, setEditingType] = useState('');

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [parentSubcategoryId, setParentSubcategoryId] = useState('');
  const [addType, setAddType] = useState('category');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [availableTemplates] = useState(categoryFieldTemplates.getAvailableTemplates());

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const fetchJson = async (url) => {
        const res = await fetch(url);
        if (!res.ok) return [];
        return res.json();
      };
      const [cats, subs] = await Promise.all([
        fetchJson(`${BASE_URL}/api/categories`),
        fetchJson(`${BASE_URL}/api/subcategories`),
      ]);

      setCategories([...cats].sort((a, b) => a.id - b.id));

      // parentSubcategoryId null/undefined = level-2 subcategory
      // parentSubcategoryId set = level-3 sub-subcategory
      const normalSubs = subs.filter(s => s.parentSubcategoryId == null);
      const subSubs    = subs.filter(s => s.parentSubcategoryId != null);
      setSubCategories(normalSubs);
      setSubSubCategories(subSubs);
    } catch (err) {
      console.error('Error fetching:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Image Upload ─────────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('http://localhost:9999/api/images/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setImageUrl(data.imageUrl);
    } catch (err) {
      alert('Image upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ─── Tree Toggle ──────────────────────────────────────────────────────────
  const toggleCategory    = (id) => setExpandedCategories(p => ({ ...p, [id]: !p[id] }));
  const toggleSubCategory = (id) => setExpandedSubCategories(p => ({ ...p, [id]: !p[id] }));

  // ─── Modal helpers ────────────────────────────────────────────────────────
  const openCreateModal = (type, catId = '', subId = '') => {
    setModalMode('create'); setAddType(type);
    setName(''); setImageUrl('');
    setParentCategoryId(catId); setParentSubcategoryId(subId);
    setEditingItem(null); setEditingType(''); setSelectedTemplate('');
    setIsOpen(true);
  };

  const openEditModal = (item, type) => {
    setModalMode('edit'); setEditingItem(item); setEditingType(type); setAddType(type);
    setName(item.name); setImageUrl(item.imageUrl || '');
    setParentCategoryId(item.categoryId ? String(item.categoryId) : '');
    setParentSubcategoryId(item.parentSubcategoryId ? String(item.parentSubcategoryId) : '');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false); setEditingItem(null);
    setName(''); setImageUrl(''); setParentCategoryId(''); setParentSubcategoryId('');
  };

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name.trim()) { alert('Please enter a name'); return; }
    try {
      if (modalMode === 'create') {
        if (addType === 'category') {
          const res = await fetch(`${BASE_URL}/api/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), imageUrl: imageUrl.trim() }),
          });
          if (!res.ok) throw new Error('Create failed');
          const result = await res.json();
          if (result?.id) await createCategoryAttributes(result.id, name.trim());

        } else if (addType === 'subcategory') {
          if (!parentCategoryId) { alert('Please select a parent category'); return; }
          const res = await fetch(`${BASE_URL}/api/subcategories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: parseInt(parentCategoryId), name: name.trim(), imageUrl: imageUrl.trim() }),
          });
          if (!res.ok) throw new Error('Create subcategory failed');

        } else if (addType === 'subsubcategory') {
          if (!parentSubcategoryId) { alert('Please select a parent subcategory'); return; }
          const res = await fetch(`${BASE_URL}/api/subcategories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim(),
              imageUrl: imageUrl.trim(),
              categoryId: parentCategoryId ? parseInt(parentCategoryId) : null,
              parentSubcategoryId: parseInt(parentSubcategoryId),
            }),
          });
          if (!res.ok) throw new Error('Create sub-subcategory failed');
        }
      } else {
        // EDIT
        if (editingType === 'category') {
          const res = await fetch(`${BASE_URL}/api/categories/${editingItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), imageUrl: imageUrl.trim() }),
          });
          if (!res.ok) throw new Error('Update failed');
        } else {
          const res = await fetch(`${BASE_URL}/api/subcategories/${editingItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              categoryId: parseInt(parentCategoryId) || editingItem.categoryId,
              name: name.trim(),
              imageUrl: imageUrl.trim(),
            }),
          });
          if (!res.ok) throw new Error('Update subcategory failed');
        }
      }
      await fetchAll();
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id, type) => {
    const label = type === 'category' ? 'category' : type === 'subcategory' ? 'subcategory' : 'sub-subcategory';
    if (!window.confirm(`Delete this ${label}?`)) return;
    try {
      if (type === 'category') {
        await categoriesApi.delete(id);
      } else {
        const res = await fetch(`${BASE_URL}/api/subcategories/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
      }
      await fetchAll();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const createCategoryAttributes = async (categoryId, categoryName) => {
    try {
      const template = categoryFieldTemplates.getTemplate(selectedTemplate || categoryName);
      if (template?.length > 0) {
        await imsService.products.createCategoryAttributes(categoryId, template.map(f => f.name));
      }
    } catch (err) { console.warn('Attributes skipped:', err); }
  };

  // ─── Search filter ────────────────────────────────────────────────────────
  const matchesSearch = (n) => n?.toLowerCase().includes(searchTerm.toLowerCase());
  const filteredCategories = categories.filter(c =>
    !searchTerm ||
    matchesSearch(c.name) ||
    subCategories.filter(s => s.categoryId === c.id).some(s =>
      matchesSearch(s.name) ||
      subSubCategories.filter(ss => ss.parentSubcategoryId === s.id).some(ss => matchesSearch(ss.name))
    )
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="admin categories-page">

      {/* ── Header ── */}
      <div className="cat-page-header">
        <div className="cat-page-title">
          <FolderOpen size={24} className="cat-page-icon" />
          <h2>Categories</h2>
        </div>
        <button className="cat-add-btn" onClick={() => openCreateModal('category')}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="cat-stats-row">
        <div className="cat-stat-card cat-stat-purple">
          <span className="cat-stat-num">{categories.length}</span>
          <span className="cat-stat-label">Categories</span>
        </div>
        <div className="cat-stat-card cat-stat-blue">
          <span className="cat-stat-num">{subCategories.length}</span>
          <span className="cat-stat-label">Subcategories</span>
        </div>
        <div className="cat-stat-card cat-stat-green">
          <span className="cat-stat-num">{subSubCategories.length}</span>
          <span className="cat-stat-label">Sub-Subcategories</span>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="cat-search-wrap">
        <Search size={15} className="cat-search-icon" />
        <input
          type="text"
          placeholder="Search categories, subcategories..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="cat-search-input"
        />
      </div>

      {/* ── Tree Card ── */}
      <div className="cat-tree-card">
        <div className="cat-tree-card-header">
          <span>Category Tree</span>
          <span className="cat-tree-hint">Hover on a row to see actions</span>
        </div>

        {loading ? (
          <div className="cat-state-msg">
            <div className="cat-spinner" />
            Loading categories...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="cat-state-msg">
            <FolderOpen size={40} style={{ color: '#c4b5fd', marginBottom: 8 }} />
            <p>No categories found</p>
            <button className="cat-add-btn" style={{ marginTop: 8 }} onClick={() => openCreateModal('category')}>
              <Plus size={14} /> Add your first category
            </button>
          </div>
        ) : (
          <div className="cat-tree">
            {filteredCategories.map(cat => {
              const catSubs   = subCategories.filter(s => s.categoryId === cat.id);
              const isExpanded = expandedCategories[cat.id];

              return (
                <div key={cat.id} className="cat-level-block">

                  {/* ── Level 1 — Category ── */}
                  <div className="cat-row cat-row-l1">
                    <button
                      className={`cat-toggle ${catSubs.length === 0 ? 'cat-toggle-disabled' : ''}`}
                      onClick={() => catSubs.length > 0 && toggleCategory(cat.id)}
                    >
                      {catSubs.length > 0
                        ? (isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />)
                        : <span className="cat-toggle-dot" />
                      }
                    </button>

                    <div className="cat-thumb-wrap">
                      {cat.imageUrl
                        ? <img src={cat.imageUrl} alt={cat.name} className="cat-thumb cat-thumb-l1" onError={e => e.target.style.display='none'} />
                        : <div className="cat-thumb-icon cat-thumb-l1"><FolderOpen size={18} /></div>
                      }
                    </div>

                    <span className="cat-name cat-name-l1">{cat.name}</span>
                    <span className="cat-pill cat-pill-purple">Category</span>
                    {catSubs.length > 0 && <span className="cat-count">{catSubs.length}</span>}

                    <div className="cat-row-actions">
                      <button className="cat-action-btn cat-action-edit" onClick={() => openEditModal(cat, 'category')}>
                        <Edit size={12} />
                      </button>
                      <button className="cat-action-btn cat-action-del" onClick={() => handleDelete(cat.id, 'category')}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* ── Level 2 — Subcategories ── */}
                  {isExpanded && catSubs.map(sub => {
                    const subSubs      = subSubCategories.filter(ss => ss.parentSubcategoryId === sub.id);
                    const isSubExpanded = expandedSubCategories[sub.id];

                    return (
                      <div key={sub.id} className="cat-level-block cat-level-block-l2">

                        <div className="cat-row cat-row-l2">
                          <button
                            className={`cat-toggle ${subSubs.length === 0 ? 'cat-toggle-disabled' : ''}`}
                            onClick={() => subSubs.length > 0 && toggleSubCategory(sub.id)}
                          >
                            {subSubs.length > 0
                              ? (isSubExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)
                              : <span className="cat-toggle-dot" />
                            }
                          </button>

                          <div className="cat-thumb-wrap">
                            {sub.imageUrl
                              ? <img src={sub.imageUrl} alt={sub.name} className="cat-thumb cat-thumb-l2" onError={e => e.target.style.display='none'} />
                              : <div className="cat-thumb-icon cat-thumb-l2"><Folder size={14} /></div>
                            }
                          </div>

                          <span className="cat-name cat-name-l2">{sub.name}</span>
                          <span className="cat-pill cat-pill-blue">Subcategory</span>
                          {subSubs.length > 0 && <span className="cat-count">{subSubs.length}</span>}

                          <div className="cat-row-actions">
                            <button className="cat-action-btn cat-action-edit" onClick={() => openEditModal(sub, 'subcategory')}>
                              <Edit size={11} />
                            </button>
                            <button className="cat-action-btn cat-action-del" onClick={() => handleDelete(sub.id, 'subcategory')}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>

                        {/* ── Level 3 — Sub-Subcategories ── */}
                        {isSubExpanded && subSubs.map(ss => (
                          <div key={ss.id} className="cat-row cat-row-l3">
                            <span className="cat-toggle-dot cat-toggle-dot-leaf" />

                            <div className="cat-thumb-wrap">
                              {ss.imageUrl
                                ? <img src={ss.imageUrl} alt={ss.name} className="cat-thumb cat-thumb-l3" onError={e => e.target.style.display='none'} />
                                : <div className="cat-thumb-icon cat-thumb-l3"><Tag size={12} /></div>
                              }
                            </div>

                            <span className="cat-name cat-name-l3">{ss.name}</span>
                            <span className="cat-pill cat-pill-green">Brand</span>

                            <div className="cat-row-actions">
                              <button className="cat-action-btn cat-action-edit" onClick={() => openEditModal(ss, 'subsubcategory')}>
                                <Edit size={11} />
                              </button>
                              <button className="cat-action-btn cat-action-del" onClick={() => handleDelete(ss.id, 'subsubcategory')}>
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {isOpen && (
        <div className="cat-modal-overlay" onClick={closeModal}>
          <div className="cat-modal" onClick={e => e.stopPropagation()}>

            <div className="cat-modal-header">
              <h3>
                {modalMode === 'create'
                  ? `Add ${addType === 'category' ? 'Category' : addType === 'subcategory' ? 'Subcategory' : 'Brand / Sub-Subcategory'}`
                  : `Edit ${editingType === 'category' ? 'Category' : editingType === 'subcategory' ? 'Subcategory' : 'Brand'}`
                }
              </h3>
              <button className="cat-modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="cat-modal-body">

              {/* Type tabs — create only */}
              {modalMode === 'create' && (
                <div className="cat-form-group">
                  <label>Type</label>
                  <div className="cat-type-tabs">
                    {['category', 'subcategory', 'subsubcategory'].map(t => (
                      <button
                        key={t}
                        className={`cat-type-tab ${addType === t ? 'active' : ''}`}
                        onClick={() => { setAddType(t); if (t === 'category') { setParentCategoryId(''); setParentSubcategoryId(''); } }}
                      >
                        {t === 'category' ? '📁 Category' : t === 'subcategory' ? '📂 Subcategory' : '🏷️ Brand'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Parent Category */}
              {(addType === 'subcategory' || addType === 'subsubcategory') && (
                <div className="cat-form-group">
                  <label>Parent Category <span className="cat-required">*</span></label>
                  <select value={parentCategoryId} onChange={e => { setParentCategoryId(e.target.value); setParentSubcategoryId(''); }}>
                    <option value="">— Select Category —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* Parent Subcategory */}
              {addType === 'subsubcategory' && (
                <div className="cat-form-group">
                  <label>Parent Subcategory <span className="cat-required">*</span></label>
                  <select value={parentSubcategoryId} onChange={e => setParentSubcategoryId(e.target.value)}>
                    <option value="">— Select Subcategory —</option>
                    {subCategories
                      .filter(s => !parentCategoryId || s.categoryId === parseInt(parentCategoryId))
                      .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                    }
                  </select>
                </div>
              )}

              {/* Name */}
              <div className="cat-form-group">
                <label>Name <span className="cat-required">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={addType === 'category' ? 'e.g. Electronics' : addType === 'subcategory' ? 'e.g. Mobile Phones' : 'e.g. Samsung'}
                  autoFocus
                />
              </div>

              {/* Image */}
              <div className="cat-form-group">
                <label>Image <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                <div className="cat-img-row">
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} id="cat-img-upload" style={{ display: 'none' }} />
                  <label htmlFor="cat-img-upload" className={`cat-upload-btn ${uploading ? 'disabled' : ''}`}>
                    {uploading ? '⏳ Uploading...' : '📁 Upload'}
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="or paste image URL"
                    className="cat-url-input"
                  />
                </div>
                {imageUrl && (
                  <img src={imageUrl} alt="preview" className="cat-img-preview" onError={e => e.target.style.display='none'} />
                )}
              </div>

              <button
                className="cat-submit-btn"
                onClick={handleSubmit}
                disabled={!name.trim()}
              >
                {modalMode === 'create' ? '+ Create' : '✓ Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
