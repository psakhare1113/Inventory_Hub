import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useActivityTracker } from './hooks/useActivityTracker';
import tracker from './services/analyticsTracker';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { CompareBar } from './components/CompareBar';
import { CompareModal } from './components/CompareModal';
import { ToastContainer } from './components/Toast';
import { AdminWelcomeMessage } from './components/AdminWelcomeMessage';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { ComparePage } from './pages/ComparePage';
import { ProfilePage } from './pages/ProfilePage';
import { MyntraCheckoutPage } from './pages/MyntraCheckoutPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { FAQPage } from './pages/FAQPage';
import { AuthModal } from './pages/AuthPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { SubcategoryPage } from './pages/SubcategoryPage';
import OAuth2CallbackPage from './pages/OAuth2CallbackPage';
import { cartManager, wishlistManager, getProduct } from './data';
import { imsService } from './services/imsApi';
import { pushNotification } from './services/notificationStore';
import AdminHome from './Admin/screens/Home';
import AdminManagement from './Admin/screens/AdminManagement';
import { Navbar as AdminNavbar } from './Admin/components/Navbar';
import CustomersModernPro from './Admin/components/CustomersModernPro';
import DeliveryBoyDashboard from './components/DeliveryBoy/DeliveryBoyDashboard';
import DeliveryLoginPage from './components/DeliveryBoy/DeliveryLoginPage';
import DeliveryRegisterPage from './components/DeliveryBoy/DeliveryRegisterPage';
import WarehouseDashboard from './components/Warehouse/WarehouseDashboard';
import WarehouseLoginPage from './components/Warehouse/WarehouseLoginPage';
import AuditLoginPage from './components/Warehouse/AuditLoginPage';
import AuditDashboard from './components/Warehouse/AuditDashboard';
import PickerDashboard from './components/Warehouse/PickerDashboard';
import PackerDashboard from './components/Warehouse/PackerDashboard';
import ShippingDashboard from './components/Warehouse/ShippingDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

// ─── Customer App ────────────────────────────────────────────────────────────
function CustomerApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, openAuthModal, closeAuthModal, authModalState, refreshAuth, logout } = useAuth();
  const { trackLogin, trackLogout } = useActivityTracker();
  const [filters, setFilters] = useState({});
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState(wishlistManager.get());
  const [showCart, setShowCart] = useState(false);
  const [compareProducts, setCompareProducts] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [profileTab, setProfileTab] = useState('wishlist');

  // ── Initialize analytics tracker once ──────────────────────────────────────
  useEffect(() => { tracker.init(); }, []);

  // ── Track page views on route change ────────────────────────────────────────
  useEffect(() => {
    tracker.trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  useEffect(() => {
    const rawCart = cartManager.get();
    if (rawCart.length > 0) {
      setCart(rawCart.map(item => ({ ...item, product: { id: item.productId, name: 'Loading...' } })));
    }
    cartManager.getWithProducts().then(c => { if (c.length > 0) setCart(c); }).catch(() => {});

    // After login, reload cart and wishlist with fresh auth token so products/images load correctly
    const handleLogin = () => {
      cartManager.getWithProducts().then(c => { if (c.length > 0) setCart(c); }).catch(() => {});
      setWishlist(wishlistManager.get()); // re-read using the now-set customerId
      refreshAuth();
    };
    window.addEventListener('userLoggedIn', handleLogin);

    // Load all subcategories once so compare can resolve brand → parent subcategory
    imsService.products.getAllSubcategories().then(subs => {
      if (Array.isArray(subs)) setAllSubcategories(subs);
    }).catch(() => {});

    return () => window.removeEventListener('userLoggedIn', handleLogin);
  }, []);

  // Auto-open auth modal when redirected from a protected route (e.g. /checkout → /)
  useEffect(() => {
    if (location.state?.authRequired && !isAuthenticated) {
      openAuthModal({
        message: location.state.message || 'Please sign in to continue.',
        redirectTo: location.state?.from?.pathname || null,
      });
      // Clear the state so it doesn't re-trigger on back navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state, isAuthenticated]);

  const handleNavigate = (page, params = {}) => {
    if (page === 'home') navigate('/');
    else if (page === 'shop') navigate('/shop');
    else if (page === 'product') navigate(`/customer/${params.customerId || params.productId}`);
    else if (page === 'compare') navigate('/compare');
    else if (page === 'profile') navigate('/profile');
    else if (page === 'checkout') navigate('/checkout');
    else if (page === 'payment') navigate('/payment', { state: params });
    else if (page === 'about') navigate('/about');
    else if (page === 'contact') navigate('/contact');
    else if (page === 'faq') navigate('/faq');
    if (params.search) setFilters({ search: params.search });
    window.scrollTo(0, 0);
  };

  const addToCart = async (productId) => {
    // Add to cart is allowed for guests — no auth required
    cartManager.add(productId);
    const rawCart = cartManager.get();
    let updatedCart;
    setCart(prev => {
      const newItemId = rawCart.find(i => Number(i.productId) === Number(productId) && !prev.some(p => p.id === i.id))?.id;
      if (newItemId) {
        updatedCart = [...prev, { id: newItemId, productId: Number(productId), quantity: 1, product: { id: Number(productId), name: 'Loading...' } }];
      } else {
        updatedCart = prev.map(item => Number(item.productId) === Number(productId) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return updatedCart;
    });
    // Count total items in cart after adding
    const totalItems = rawCart.reduce((sum, i) => sum + (i.quantity || 1), 0);
    showToast(`🛒 Added to cart! (${totalItems} item${totalItems !== 1 ? 's' : ''} in cart)`);
    cartManager.getWithProducts().then(c => { if (c.length > 0) setCart(c); }).catch(() => {});
    // Track event
    tracker.trackAddToCart({ id: productId, name: 'Product', price: 0 }, 1);
  };

  const toggleWishlist = (productId) => {
    // Auth guard — unauthenticated users see sign-in modal
    if (!isAuthenticated) {
      openAuthModal({
        message: 'Please sign in to save items to your wishlist.',
        pendingAction: () => toggleWishlist(productId),
      });
      return;
    }
    wishlistManager.toggle(productId);
    setWishlist(wishlistManager.get());
    const added = wishlistManager.has(productId);
    showToast(added ? 'Added to wishlist!' : 'Removed from wishlist!');
    if (added) tracker.trackWishlistAdd(productId);
    else tracker.trackWishlistRemove(productId);
  };

  const toggleCart = () => setShowCart(s => !s);

  const filterByCategory = (categoryId) => navigate(`/category/${categoryId}`);

  const filterBySubcategory = (subcategoryId, categoryId) => {
    setFilters({ categoryId, subcategoryId });
    navigate('/shop');
  };

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 bg-foreground text-white px-6 py-3 rounded-lg shadow-xl z-[9999] transition-all';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const updateCartQuantity = async (id, quantity) => {
    if (quantity < 1) { removeFromCart(id); return; }
    cartManager.update(id, quantity);
    setCart(await cartManager.getWithProducts());
  };

  const removeFromCart = async (id) => {
    cartManager.remove(id);
    setCart(await cartManager.getWithProducts());
  };

  const checkout = () => {
    if (!isAuthenticated) {
      openAuthModal({
        message: 'Sign in to continue with your order.',
        redirectTo: '/checkout',
      });
      return;
    }
    tracker.trackCheckoutStart(
      cart.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0),
      cart.reduce((s, i) => s + i.quantity, 0)
    );
    navigate('/checkout');
    setShowCart(false);
  };

  const placeOrder = (formData) => {
    const order = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      items: cart,
      total: cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) + 50,
      shippingInfo: formData,
      status: 'Processing'
    };
    setOrderHistory([order, ...orderHistory]);

    // 🔔 New order notification for Admin
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const orderTotal = order.total;
    const shortId = String(order.id).slice(-6);
    pushNotification({
      type:    'NEW_ORDER',
      title:   `🛒 New Order #${shortId}`,
      message: `${itemCount} item(s) · ₹${orderTotal.toLocaleString('en-IN')} · ${formData.paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}`,
      source:  'ORDER',
      orderId: order.id,
    });

    // Track order placed
    tracker.trackOrderPlaced(order.id, orderTotal, itemCount);

    showToast('🎉 Order placed! Check your email for confirmation.');
    cartManager.clear();
    setCart([]);
    setProfileTab('orders');
    navigate('/profile');
  };

  const [showCompareModal, setShowCompareModal] = useState(false);

  const addToCompare = async (productId) => {
    const product = await getProduct(productId);
    if (!product) return;
    if (compareProducts.find(p => p.id === productId)) { showToast('Already in compare list'); return; }
    if (compareProducts.length >= 3) { showToast('Maximum 3 products can be compared'); return; }

    // Resolve effective subcategory for comparison:
    // If the product's subcategoryId belongs to a brand (sub-subcategory with parentSubcategoryId),
    // use the parent subcategory ID so products from different brands under the same subcategory can be compared.
    const getEffectiveSubcategoryId = (subcategoryId) => {
      const sub = allSubcategories.find(s => Number(s.id) === Number(subcategoryId));
      return sub?.parentSubcategoryId ? Number(sub.parentSubcategoryId) : Number(subcategoryId);
    };

    // Enforce same-subcategory comparison
    if (compareProducts.length > 0) {
      const existingEffective = getEffectiveSubcategoryId(compareProducts[0].subcategoryId);
      const newEffective = getEffectiveSubcategoryId(product.subcategoryId);
      if (existingEffective !== newEffective) {
        showToast('⚠️ Cannot compare different subcategories. Please select products from the same subcategory.');
        return;
      }
    }
    setCompareProducts([...compareProducts, product]);
    showToast('Added to compare');
  };

  const removeFromCompare = (productId) => setCompareProducts(compareProducts.filter(p => p.id !== productId));
  const clearCompare = () => setCompareProducts([]);

  const ProductDetailsWrapper = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      getProduct(parseInt(id)).then(setProduct).catch(console.error).finally(() => setLoading(false));
    }, [id]);
    if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 text-center">Loading product...</div>;
    return <ProductDetailsPage product={product} wishlist={wishlist} onAddToCart={addToCart} onToggleWishlist={toggleWishlist} onBuyNow={() => {
      if (!isAuthenticated) {
        openAuthModal({ message: 'Sign in to continue with your purchase.', redirectTo: '/checkout' });
        return;
      }
      navigate('/checkout');
    }} onNavigateToProduct={(productId) => { navigate(`/customer/${productId}`); window.scrollTo(0, 0); }} />;
  };

  const CategoryWrapper = () => {
    const { id } = useParams();
    return <SubcategoryPage categoryId={id} onNavigate={handleNavigate} onFilterBySubcategory={filterBySubcategory} />;
  };

  return (
    <>
      <AdminWelcomeMessage />
      <Navbar
        currentPage=""
        cart={cart}
        wishlist={wishlist}
        onNavigate={handleNavigate}
        onToggleCart={toggleCart}
        onToggleAuth={() => openAuthModal({ message: 'Sign in to your account.' })}
        onRequireAuth={openAuthModal}
      />
      <main>
        <Routes>
          <Route path="/" element={<HomePage compareProducts={compareProducts} wishlist={wishlist} onNavigate={handleNavigate} onAddToCart={addToCart} onToggleWishlist={toggleWishlist} onAddToCompare={addToCompare} onFilterByCategory={filterByCategory} isAuthenticated={isAuthenticated} onRequireAuth={openAuthModal} />} />
          <Route path="/shop" element={<ShopPage filters={filters} compareProducts={compareProducts} wishlist={wishlist} onNavigate={handleNavigate} onAddToCart={addToCart} onToggleWishlist={toggleWishlist} onAddToCompare={addToCompare} onFilterByCategory={filterByCategory} onClearFilters={() => setFilters({})} />} />
          <Route path="/customer/:id" element={<ProductDetailsWrapper />} />
          <Route path="/product/:id" element={<ProductDetailsWrapper />} />
          <Route path="/category/:id" element={<CategoryWrapper />} />
          <Route path="/compare" element={<ComparePage compareProducts={compareProducts} onClear={clearCompare} onRemove={removeFromCompare} onAddToCart={addToCart} onNavigate={handleNavigate} />} />
          <Route path="/profile" element={
            isAuthenticated
              ? <ProfilePage wishlist={wishlist} orderHistory={orderHistory} profileTab={profileTab} setProfileTab={setProfileTab} compareProducts={compareProducts} onNavigate={handleNavigate} onAddToCart={addToCart} onToggleWishlist={toggleWishlist} onAddToCompare={addToCompare} onSignOut={() => { logout(); setWishlist([]); setCart([]); showToast('Signed out successfully!'); navigate('/'); }} />
              : <Navigate to="/" state={{ authRequired: true, message: 'Please sign in to view your profile.' }} replace />
          } />
          <Route path="/checkout" element={
            isAuthenticated
              ? <MyntraCheckoutPage cart={cart} onPlaceOrder={placeOrder} onNavigate={handleNavigate} />
              : <Navigate to="/" state={{ authRequired: true, message: 'Sign in to continue with your order.' }} replace />
          } />
          <Route path="/about" element={<AboutPage onNavigate={handleNavigate} />} />
          <Route path="/contact" element={<ContactPage onNavigate={handleNavigate} onFilterByCategory={filterByCategory} />} />
          <Route path="/faq" element={<FAQPage onNavigate={handleNavigate} onFilterByCategory={filterByCategory} />} />
          <Route path="/user-dashboard" element={<HomePage compareProducts={compareProducts} wishlist={wishlist} onNavigate={handleNavigate} onAddToCart={addToCart} onToggleWishlist={toggleWishlist} onAddToCompare={addToCompare} onFilterByCategory={filterByCategory} isAuthenticated={isAuthenticated} onRequireAuth={openAuthModal} />} />
        </Routes>
      </main>
      {/* Auth Modal — driven by AuthContext */}
      <AuthModal
        showAuthModal={authModalState.open}
        onClose={closeAuthModal}
        authMessage={authModalState.message}
        redirectTo={authModalState.redirectTo}
        pendingAction={authModalState.pendingAction}
      />
      <CartDrawer showCart={showCart} cart={cart} onToggleCart={toggleCart} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onCheckout={checkout} onNavigate={handleNavigate} isAuthenticated={isAuthenticated} onRequireAuth={openAuthModal} />
      <CompareBar compareProducts={compareProducts} onRemove={removeFromCompare} onClear={clearCompare} onNavigate={handleNavigate} onOpenModal={() => setShowCompareModal(true)} />
      {showCompareModal && <CompareModal compareProducts={compareProducts} onClose={() => { setShowCompareModal(false); clearCompare(); }} onRemove={removeFromCompare} onClear={clearCompare} onAddToCart={addToCart} />}
    </>
  );
}

// ─── Admin App ────────────────────────────────────────────────────────────────
function AdminApp({ userRole }) {
  return (
    <>
      <AdminNavbar />
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="ADMIN" userRole={userRole}><AdminHome /></ProtectedRoute>} />
        <Route path="/admin-dashboard"  element={<ProtectedRoute requiredRole="ADMIN" userRole={userRole}><AdminHome /></ProtectedRoute>} />
        <Route path="/admin-home"       element={<ProtectedRoute requiredRole="ADMIN" userRole={userRole}><AdminHome /></ProtectedRoute>} />
        <Route path="/customers-pro"    element={<ProtectedRoute requiredRole="ADMIN" userRole={userRole}><CustomersModernPro /></ProtectedRoute>} />
        <Route path="/admin/management" element={<ProtectedRoute requiredRole="ADMIN" userRole={userRole}><AdminManagement /></ProtectedRoute>} />
        <Route path="*" element={<ProtectedRoute requiredRole="ADMIN" userRole={userRole}><AdminHome /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

// ─── Root — decides which app to render ──────────────────────────────────────
function AppContent() {
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isAdminRoute = location.pathname.startsWith('/admin') ||
    location.pathname === '/admin-dashboard' ||
    location.pathname === '/admin-home' ||
    location.pathname === '/customers-pro';

  const isDeliveryRoute   = location.pathname.startsWith('/delivery');
  const isWarehouseRoute  = location.pathname.startsWith('/warehouse');
  const isAuditRoute      = location.pathname.startsWith('/audit/');

  // All warehouse staff roles
  const ALL_WAREHOUSE_ROLES = ['WAREHOUSE_MANAGER', 'RECEIVING', 'AUDITOR', 'PICKER', 'PACKER', 'SHIPPING', 'VIEWER'];

  useEffect(() => {
    const verify = async () => {
      // Admin routes: prefer sessionStorage token (tab-specific, not overwritten by
      // customer login in another tab). Fall back to localStorage for non-admin routes.
      // Warehouse routes: use sessionStorage token (tab-specific)
      const token = isAdminRoute
        ? (sessionStorage.getItem('adminToken') || localStorage.getItem('token'))
        : (isWarehouseRoute || isAuditRoute)
          ? (sessionStorage.getItem('warehouseAuthToken') || sessionStorage.getItem('warehouseToken'))
          : isDeliveryRoute
            ? (sessionStorage.getItem('authToken') || sessionStorage.getItem('token'))
            : localStorage.getItem('token');

      if (!token) { setAuthLoading(false); return; }
      try {
        const res = await fetch('http://localhost:9999/api/auth/user/profile', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          // Server-verified role — single source of truth
          const serverRole = data.isAdmin
            ? 'ADMIN'
            : (data.isDeliveryBoy || data.role === 'DELIVERY_BOY' || data.userRole === 'DELIVERY_BOY')
              ? 'DELIVERY_BOY'
              : (data.role === 'WAREHOUSE_MANAGER' || data.userRole === 'WAREHOUSE_MANAGER' ||
                 data.role === 'RECEIVING' || data.role === 'AUDITOR' ||
                 data.role === 'PICKER' || data.role === 'PACKER' || data.role === 'SHIPPING' ||
                 data.userRole === 'RECEIVING' || data.userRole === 'AUDITOR' ||
                 data.userRole === 'PICKER' || data.userRole === 'PACKER' || data.userRole === 'SHIPPING')
                ? (data.role || data.userRole)
                : (data.role || data.userRole || 'USER');
          setUserRole(serverRole);
          
          // Store role in appropriate storage based on route type
          if (isWarehouseRoute || isAuditRoute) {
            sessionStorage.setItem('warehouseUserRole', serverRole);
          } else if (isDeliveryRoute) {
            sessionStorage.setItem('userRole', serverRole); // tab-specific for delivery
          } else {
            localStorage.setItem('isAdmin', String(data.isAdmin));
            localStorage.setItem('userRole', serverRole); // keep in sync with server
          }
        } else if (res.status === 401) {
          if (isDeliveryRoute) {
            ['token','authToken','isDeliveryBoy','customerId','firstName','lastName','userRole','userName'].forEach(k => sessionStorage.removeItem(k));
          } else {
            ['token','authToken','isAdmin','currentView','customerId','firstName','lastName','userRole'].forEach(k => localStorage.removeItem(k));
          }
          setUserRole(null);
        }
      } catch {
        setUserRole(null);
      } finally {
        setAuthLoading(false);
      }
    };
    verify();
  }, [location.pathname]);

  // Listen for role promotion
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.newRole === 'ADMIN') setUserRole('ADMIN');
    };
    window.addEventListener('roleChanged', handler);
    return () => window.removeEventListener('roleChanged', handler);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // /admin/login — show login page without navbar
  if (location.pathname === '/admin/login' || location.pathname === '/admin') {
    return <AdminLoginPage />;
  }

  // /oauth2/callback — Google OAuth2 redirect landing page (no navbar needed)
  if (location.pathname === '/oauth2/callback') {
    return <OAuth2CallbackPage />;
  }
  if (location.pathname === '/delivery/login') {
    // Already logged in as delivery boy → go to dashboard
    if (userRole === 'DELIVERY_BOY') return <Navigate to="/delivery/dashboard" replace />;
    return <DeliveryLoginPage />;
  }

  if (location.pathname === '/delivery/register') {
    // Already a delivery boy → go to dashboard
    if (userRole === 'DELIVERY_BOY') return <Navigate to="/delivery/dashboard" replace />;
    return <DeliveryRegisterPage />;
  }

  // /delivery/* — only for verified delivery boys
  if (isDeliveryRoute) {
    if (userRole === 'DELIVERY_BOY') return <DeliveryBoyDashboard />;
    return <Navigate to="/delivery/login" replace />;
  }

  // Auto-redirect delivery boy only right after login (not on every page visit)
  if (userRole === 'DELIVERY_BOY' && !isDeliveryRoute && !isAdminRoute) {
    const justLoggedIn = sessionStorage.getItem('deliveryJustLoggedIn');
    if (justLoggedIn) {
      sessionStorage.removeItem('deliveryJustLoggedIn');
      return <Navigate to="/delivery/dashboard" replace />;
    }
    // Already browsing — let them see customer view
  }

  // /audit/login — only for AUDITOR and VIEWER
  if (location.pathname === '/audit/login') {
    if (userRole === 'AUDITOR' || userRole === 'VIEWER') return <Navigate to="/audit/dashboard" replace />;
    return <AuditLoginPage />;
  }

  // /audit/dashboard — Auditor/Viewer dedicated dashboard
  if (location.pathname.startsWith('/audit/')) {
    if (userRole === 'AUDITOR' || userRole === 'VIEWER') return <AuditDashboard />;
    return <Navigate to="/audit/login" replace />;
  }

  // /warehouse/login
  if (location.pathname === '/warehouse/login') {
    const warehouseRoles = ['WAREHOUSE_MANAGER', 'RECEIVING', 'AUDITOR', 'VIEWER'];
    if (warehouseRoles.includes(userRole)) return <Navigate to="/warehouse/dashboard" replace />;
    if (userRole === 'PICKER')    return <Navigate to="/warehouse/picker" replace />;
    if (userRole === 'PACKER')    return <Navigate to="/warehouse/packer" replace />;
    if (userRole === 'SHIPPING')  return <Navigate to="/warehouse/shipping" replace />;
    return <WarehouseLoginPage />;
  }

  // /warehouse/* — route to role-specific dashboard
  if (isWarehouseRoute) {
    // PICKER
    if (userRole === 'PICKER') return <PickerDashboard />;
    // PACKER
    if (userRole === 'PACKER') return <PackerDashboard />;
    // SHIPPING
    if (userRole === 'SHIPPING') return <ShippingDashboard />;
    // WAREHOUSE_MANAGER, RECEIVING, AUDITOR, VIEWER
    const warehouseRoles = ['WAREHOUSE_MANAGER', 'RECEIVING', 'AUDITOR', 'VIEWER'];
    if (warehouseRoles.includes(userRole)) return <WarehouseDashboard />;
    return <Navigate to="/warehouse/login" replace />;
  }

  // Auto-redirect warehouse staff right after login
  if (ALL_WAREHOUSE_ROLES.includes(userRole) && !isWarehouseRoute && !isAuditRoute && !isAdminRoute) {
    const justLoggedIn = sessionStorage.getItem('warehouseJustLoggedIn');
    if (justLoggedIn) {
      sessionStorage.removeItem('warehouseJustLoggedIn');
      // AUDITOR + VIEWER → Audit Dashboard
      if (userRole === 'AUDITOR' || userRole === 'VIEWER') return <Navigate to="/audit/dashboard" replace />;
      // Route to role-specific dashboard
      if (userRole === 'PICKER')   return <Navigate to="/warehouse/picker" replace />;
      if (userRole === 'PACKER')   return <Navigate to="/warehouse/packer" replace />;
      if (userRole === 'SHIPPING') return <Navigate to="/warehouse/shipping" replace />;
      return <Navigate to="/warehouse/dashboard" replace />;
    }
  }

  // /admin/* — Admin App
  if (isAdminRoute) {
    return <AdminApp userRole={userRole} />;
  }

  // Everything else — Customer App
  return <CustomerApp />;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <Router>
            <AppContent />
          </Router>
          <ToastContainer />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
