import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Package, ChevronRight, Bell } from 'lucide-react';
import AdminNotifications from './AdminNotifications';
import '../css/Navbar.css';

export function Navbar() {
  const navigate = useNavigate();

  // ── Search state ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // ── Admin info ────────────────────────────────────────────────────────────
  const getAdminInfo = () => {
    const firstName =
      sessionStorage.getItem('adminFirstName') ||
      localStorage.getItem('firstName') ||
      'Admin';
    const lastName =
      sessionStorage.getItem('adminLastName') ||
      localStorage.getItem('lastName') ||
      'User';
    const username =
      sessionStorage.getItem('adminUsername') ||
      localStorage.getItem('username') ||
      'admin@example.com';
    return {
      firstName, lastName, username,
      fullName: `${firstName} ${lastName}`,
      initials: `${firstName[0]}${lastName[0]}`.toUpperCase(),
    };
  };

  const adminInfo = getAdminInfo();

  // ── Search logic ──────────────────────────────────────────────────────────
  const fetchSearchResults = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const isAdmin = sessionStorage.getItem('isAdminSession') === 'true';
      const token = isAdmin
        ? sessionStorage.getItem('adminToken')
        : (localStorage.getItem('authToken') || localStorage.getItem('token'));

      const headers = {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      };

      const res = await fetch(
        `http://localhost:9999/api/products?search=${encodeURIComponent(query.trim())}`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        const products = Array.isArray(data) ? data : data.content || data.products || [];
        // Filter client-side as fallback
        const filtered = products
          .filter(
            (p) =>
              p.name?.toLowerCase().includes(query.toLowerCase()) ||
              p.productBarcode?.toLowerCase().includes(query.toLowerCase()) ||
              p.description?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 8);
        setSearchResults(filtered);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch {
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length >= 2) {
      debounceRef.current = setTimeout(() => fetchSearchResults(searchQuery), 350);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, fetchSearchResults]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSelect = (product) => {
    setSearchQuery('');
    setShowDropdown(false);
    navigate('/admin/products', { state: { highlightProductId: product.productId } });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      navigate('/admin/products', { state: { searchTerm: searchQuery.trim() } });
      setSearchQuery('');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    ['token', 'authToken', 'role', 'username', 'currentView', 'isAdmin', 'customerId', 'firstName', 'lastName'].forEach(
      (k) => localStorage.removeItem(k)
    );
    window.location.href = '/admin/login';
  };

  const goToDashboard = () => navigate('/admin/dashboard');

  return (
    <header className="admin-navbar">
      <div className="navbar-container">
        <div className="navbar-content">

          {/* ── Brand ── */}
          <div className="navbar-brand" onClick={goToDashboard} role="button" tabIndex={0}>
            <div className="navbar-logo-wrapper">
              <img src="/images/logo.png" alt="Logo" className="navbar-logo" />
            </div>
            <div className="navbar-brand-text">
              <span className="navbar-title">InventoryHub</span>
              <span className="navbar-subtitle">Admin Panel</span>
            </div>
          </div>

          {/* ── Global Search ── */}
          <div className={`navbar-search-wrapper ${searchFocused ? 'focused' : ''}`} ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="navbar-search-form">
              <div className="navbar-search-inner">
                <Search className="navbar-search-icon" size={16} />
                <input
                  type="text"
                  className="navbar-search-input"
                  placeholder="Search products, barcodes…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    setSearchFocused(true);
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  autoComplete="off"
                />
                {searchLoading && <span className="navbar-search-spinner" />}
                {searchQuery && !searchLoading && (
                  <button type="button" className="navbar-search-clear" onClick={clearSearch} aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>

            {/* Dropdown results */}
            {showDropdown && (
              <div className="navbar-search-dropdown">
                {searchResults.length > 0 ? (
                  <>
                    <div className="search-dropdown-header">
                      <span>Products</span>
                      <span className="search-result-count">{searchResults.length} found</span>
                    </div>
                    <ul className="search-result-list">
                      {searchResults.map((product) => (
                        <li
                          key={product.productId}
                          className="search-result-item"
                          onClick={() => handleSearchSelect(product)}
                        >
                          <div className="search-result-icon">
                            {product.productUrl ? (
                              <img src={product.productUrl} alt="" className="search-result-img" />
                            ) : (
                              <Package size={16} />
                            )}
                          </div>
                          <div className="search-result-info">
                            <span className="search-result-name">{product.name}</span>
                            <span className="search-result-meta">
                              {product.productBarcode && `#${product.productBarcode}`}
                              {product.status && (
                                <span className={`search-result-status ${product.status.toLowerCase()}`}>
                                  {product.status}
                                </span>
                              )}
                            </span>
                          </div>
                          <ChevronRight size={14} className="search-result-arrow" />
                        </li>
                      ))}
                    </ul>
                    <div className="search-dropdown-footer" onClick={handleSearchSubmit}>
                      <span>View all results for "<strong>{searchQuery}</strong>"</span>
                      <ChevronRight size={14} />
                    </div>
                  </>
                ) : (
                  <div className="search-no-results">
                    <Package size={24} />
                    <span>No products found for "<strong>{searchQuery}</strong>"</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right nav ── */}
          <nav className="navbar-nav">
            <button onClick={goToDashboard} className="nav-link">
              Dashboard
            </button>
            <button onClick={handleLogout} className="nav-link logout">
              Logout
            </button>

            {/* Notification Bell */}
            <AdminNotifications />

            {/* Admin Profile */}
            <div className="admin-profile">
              <div className="admin-avatar">
                <span className="admin-initials">{adminInfo.initials}</span>
              </div>
              <div className="admin-info">
                <span className="admin-name">{adminInfo.fullName}</span>
                <span className="admin-role">Administrator</span>
              </div>
            </div>
          </nav>

        </div>
      </div>
    </header>
  );
}
