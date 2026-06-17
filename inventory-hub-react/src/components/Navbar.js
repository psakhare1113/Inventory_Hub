import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { categoriesApi, subcategoriesApi } from '../services/apiService';
import tracker from '../services/analyticsTracker';

export const Navbar = ({ currentPage, cart, wishlist, onNavigate, onToggleCart, onToggleAuth, hideAdminStatus = false, onRequireAuth }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // ── User menu ─────────────────────────────────────────────────────────────
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuTimerRef = useRef(null);
  const openUserMenu  = () => { setShowUserMenu(true);  if (menuTimerRef.current) clearTimeout(menuTimerRef.current); menuTimerRef.current = setTimeout(() => setShowUserMenu(false), 4000); };
  const closeUserMenu = () => { setShowUserMenu(false); if (menuTimerRef.current) clearTimeout(menuTimerRef.current); };
  const handleLogout  = () => { logout(); closeUserMenu(); onNavigate('home'); };

  // ── Categories + Subcategories ────────────────────────────────────────────
  const [categories,    setCategories]    = useState([]);
  const [subcategories, setSubcategories] = useState([]);   // all subs
  const [showCatDropdown,  setShowCatDropdown]  = useState(false);
  const [hoveredCatId,     setHoveredCatId]     = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const catDropdownRef  = useRef(null);
  const catHoverTimer   = useRef(null);
  const dropdownHideTimer = useRef(null);

  useEffect(() => {
    categoriesApi.getAll()
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {});
    subcategoriesApi.getAll()
      .then(d => setSubcategories(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const subsForCat = (catId) =>
    subcategories.filter(s => String(s.categoryId) === String(catId));

  const selectedCatName = categories.find(c => String(c.id) === String(selectedCategory))?.name || 'All';

  // open on hover, keep open while mouse is inside
  const handleCatMouseEnter = () => {
    clearTimeout(dropdownHideTimer.current);
    setShowCatDropdown(true);
  };
  const handleCatMouseLeave = () => {
    dropdownHideTimer.current = setTimeout(() => {
      setShowCatDropdown(false);
      setHoveredCatId(null);
    }, 180);
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchQuery,          setSearchQuery]          = useState('');
  const [searchResults,        setSearchResults]        = useState([]);
  const [searchLoading,        setSearchLoading]        = useState(false);
  const [showResultsDropdown,  setShowResultsDropdown]  = useState(false);
  const [searchFocused,        setSearchFocused]        = useState(false);
  const searchWrapperRef = useRef(null);
  const debounceRef      = useRef(null);

  // close search dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowResultsDropdown(false);
        setSearchFocused(false);
      }
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setShowCatDropdown(false);
        setHoveredCatId(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const fetchResults = useCallback(async (query) => {
    if (!query || query.trim().length < 2) { setSearchResults([]); setShowResultsDropdown(false); return; }
    setSearchLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const catParam = selectedCategory ? `&categoryId=${selectedCategory}` : '';
      const res = await fetch(
        `http://localhost:9999/api/products?search=${encodeURIComponent(query.trim())}${catParam}`,
        { headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' } }
      );
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.content || data.products || [];
        const filtered = list
          .filter(p =>
            p.name?.toLowerCase().includes(query.toLowerCase()) ||
            p.productBarcode?.toLowerCase().includes(query.toLowerCase()) ||
            p.description?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 7);
        setSearchResults(filtered);
        setShowResultsDropdown(true);
      } else { setSearchResults([]); setShowResultsDropdown(false); }
    } catch { setSearchResults([]); setShowResultsDropdown(false); }
    finally { setSearchLoading(false); }
  }, [selectedCategory]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (searchQuery.trim().length >= 2) {
      debounceRef.current = setTimeout(() => fetchResults(searchQuery), 350);
    } else { setSearchResults([]); setShowResultsDropdown(false); }
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, fetchResults]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    // Track search event
    tracker.trackSearch(searchQuery.trim(), searchResults.length);
    setShowResultsDropdown(false);
    setShowCatDropdown(false);
    if (selectedCategory) navigate(`/category/${selectedCategory}`, { state: { search: searchQuery.trim() } });
    else onNavigate('shop', { search: searchQuery.trim() });
    setSearchQuery('');
  };

  const handleResultClick = (product) => {
    // Track search + product click
    tracker.trackSearch(searchQuery.trim(), searchResults.length);
    tracker.trackProductView({ id: product.productId, name: product.name, category: product.categoryName });
    setSearchQuery('');
    setShowResultsDropdown(false);
    navigate(`/customer/${product.productId}`);
  };

  // ── Avatar helpers ────────────────────────────────────────────────────────
  const getAvatarColor = (id) => {
    const colors = ['bg-gradient-to-br from-blue-500 to-blue-600','bg-gradient-to-br from-emerald-500 to-emerald-600','bg-gradient-to-br from-purple-500 to-purple-600','bg-gradient-to-br from-rose-500 to-rose-600','bg-gradient-to-br from-amber-500 to-amber-600','bg-gradient-to-br from-cyan-500 to-cyan-600'];
    return colors[(parseInt(id, 10) || 0) % colors.length];
  };
  const getInitials = () => {
    const f = user?.firstName || '', l = user?.lastName || '';
    if (!f && !l) return 'U';
    return `${f[0] || ''}${l[0] || ''}`.toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-nav border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 h-16">

          {/* ── Logo ── */}
          <div
            className="flex items-center gap-2 text-lg font-serif font-bold text-foreground cursor-pointer flex-shrink-0"
            onClick={() => onNavigate('home')}
          >
            <img src="/images/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
            <span className="hidden md:block">Inventory Hub</span>
          </div>

          {/* ── Search Bar ── */}
          <div className="flex-1 flex items-center min-w-0 relative" ref={searchWrapperRef}>
            <form
              onSubmit={handleSearchSubmit}
              className={`flex items-center w-full rounded-lg border transition-all duration-200 bg-white
                ${searchFocused ? 'border-primary shadow-sm shadow-primary/10' : 'border-gray-200'}`}
              style={{ height: '36px' }}
            >
              {/* ── Category selector (hover-triggered) ── */}
              <div
                className="relative flex-shrink-0 h-full"
                ref={catDropdownRef}
                onMouseEnter={handleCatMouseEnter}
                onMouseLeave={handleCatMouseLeave}
              >
                <button
                  type="button"
                  className="flex items-center px-2.5 h-full text-xs font-medium text-gray-600 bg-gray-50 border-r border-gray-200 rounded-l-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
                  style={{ minWidth: '72px', maxWidth: '120px' }}
                >
                  <span className="truncate">{selectedCatName}</span>
                </button>

                {/* ── Mega dropdown: categories + subcategories ── */}
                {showCatDropdown && (
                  <div
                    className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-[300] flex"
                    style={{ minWidth: '200px' }}
                    onMouseEnter={handleCatMouseEnter}
                    onMouseLeave={handleCatMouseLeave}
                  >
                    {/* Left: category list */}
                    <ul className="py-1.5 w-48 border-r border-gray-100 max-h-80 overflow-y-auto flex-shrink-0">
                      {/* All */}
                      <li>
                        <button
                          type="button"
                          onClick={() => { setSelectedCategory(''); setShowCatDropdown(false); setHoveredCatId(null); }}
                          onMouseEnter={() => setHoveredCatId(null)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors
                            ${!selectedCategory && !hoveredCatId ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          <span className="text-base">🏠</span>
                          All Categories
                        </button>
                      </li>
                      <li className="h-px bg-gray-100 mx-2 my-1" />
                      {categories.map(cat => {
                        const hasSubs = subsForCat(cat.id).length > 0;
                        const isHovered = String(hoveredCatId) === String(cat.id);
                        const isSelected = String(selectedCategory) === String(cat.id);
                        return (
                          <li key={cat.id}>
                            <button
                              type="button"
                              onMouseEnter={() => setHoveredCatId(cat.id)}
                              onClick={() => {
                                setSelectedCategory(String(cat.id));
                                if (!hasSubs) { setShowCatDropdown(false); setHoveredCatId(null); }
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors
                                ${isHovered || isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                            >
                              {cat.imageUrl
                                ? <img src={cat.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                : <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] flex-shrink-0">📦</span>
                              }
                              <span className="flex-1 truncate">{cat.name}</span>
                              {hasSubs && (
                                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Right: subcategories flyout (shown on hover) */}
                    {hoveredCatId && subsForCat(hoveredCatId).length > 0 && (
                      <ul className="py-1.5 w-48 max-h-80 overflow-y-auto">
                        <li className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          {categories.find(c => String(c.id) === String(hoveredCatId))?.name}
                        </li>
                        {subsForCat(hoveredCatId).map(sub => (
                          <li key={sub.id}>
                            <button
                              type="button"
                              onClick={() => {
                                navigate(`/category/${hoveredCatId}`, { state: { subcategoryId: sub.id } });
                                setShowCatDropdown(false);
                                setHoveredCatId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                            >
                              {sub.imageUrl
                                ? <img src={sub.imageUrl} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                                : <span className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center text-[9px] flex-shrink-0">›</span>
                              }
                              <span className="truncate">{sub.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Search input */}
              <input
                type="text"
                placeholder={selectedCategory ? `Search in ${selectedCatName}…` : 'Search products…'}
                className="flex-1 px-3 text-sm text-gray-800 bg-transparent outline-none placeholder-gray-400 min-w-0 h-full"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => { setSearchFocused(true); if (searchResults.length > 0) setShowResultsDropdown(true); }}
                autoComplete="off"
              />

              {/* Clear */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResultsDropdown(false); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Spinner */}
              {searchLoading && (
                <div className="p-1.5 flex-shrink-0">
                  <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
                </div>
              )}

              {/* Search button */}
              <button
                type="submit"
                className="flex items-center justify-center px-3 bg-primary hover:bg-primary/90 text-white rounded-r-lg transition-colors flex-shrink-0 h-full"
                aria-label="Search"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* ── Live results dropdown ── */}
            {showResultsDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[150] overflow-hidden">
                {searchResults.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Products</span>
                      <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{searchResults.length} found</span>
                    </div>
                    <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {searchResults.map(product => (
                        <li
                          key={product.productId}
                          onClick={() => handleResultClick(product)}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                            {product.productUrl
                              ? <img src={product.productUrl} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-gray-400">📦</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate group-hover:text-primary transition-colors">{product.name}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {product.productBarcode && `#${product.productBarcode}`}
                              {product.status && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold
                                  ${product.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  {product.status}
                                </span>
                              )}
                            </p>
                          </div>
                          <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleSearchSubmit}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-primary font-medium hover:bg-primary/5 transition-colors border-t border-gray-100"
                    >
                      <span>View all results for "<strong>{searchQuery}</strong>"</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
                    <span className="text-2xl">🔍</span>
                    <p className="text-xs">No products found for "<strong className="text-gray-600">{searchQuery}</strong>"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right actions ── */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* Nav links — desktop */}
            <nav className="hidden lg:flex items-center gap-0.5 mr-1">
              {[['home','Home'],['shop','Shop'],['about','About']].map(([page, label]) => (
                <button
                  key={page}
                  onClick={() => onNavigate(page)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors hover:text-primary hover:bg-primary/5
                    ${currentPage === page ? 'text-primary' : 'text-gray-600'}`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* User menu */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => showUserMenu ? closeUserMenu() : openUserMenu()}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg transition-colors hover:bg-gray-100"
                >
                  <div className={`w-7 h-7 rounded-full ${getAvatarColor(user.customerId)} text-white flex items-center justify-center font-semibold text-xs`}>
                    {getInitials()}
                  </div>
                  <svg className="w-3.5 h-3.5 hidden sm:block text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
                    <div className="px-3 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        Hi, {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{localStorage.getItem('email') || ''}</p>
                    </div>
                    {[
                      { label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', action: () => { onNavigate('profile'); closeUserMenu(); } },
                      { label: 'My Orders',  icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', action: () => { onNavigate('profile'); closeUserMenu(); } },
                    ].map(item => (
                      <button key={item.label} onClick={item.action} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                        {item.label}
                      </button>
                    ))}
                    <div className="border-t border-gray-100 my-1" />
                    <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onToggleAuth}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-medium text-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Sign In
              </button>
            )}

            {/* Wishlist */}
            <button
              onClick={() => { if (isAuthenticated) onNavigate('profile'); else if (onRequireAuth) onRequireAuth({ message: 'Please sign in to view your wishlist.' }); }}
              className="relative p-1.5 hover:text-primary transition-colors"
              title={isAuthenticated ? 'My Wishlist' : 'Sign in to view wishlist'}
            >
              <svg className="w-4.5 h-4.5" style={{width:'18px',height:'18px'}} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isAuthenticated && wishlist.length > 0 && (
                <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">{wishlist.length}</span>
              )}
              {!isAuthenticated && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-gray-400 flex items-center justify-center text-white" style={{fontSize:'6px'}}>🔒</span>
              )}
            </button>

            {/* Cart */}
            <button onClick={onToggleCart} className="relative p-1.5 hover:text-primary transition-colors" title="Shopping Cart">
              <svg style={{width:'18px',height:'18px'}} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cart.length > 0 && (
                <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
