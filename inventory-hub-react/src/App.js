import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { CompareBar } from './components/CompareBar';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { ComparePage } from './pages/ComparePage';
import { ProfilePage } from './pages/ProfilePage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { FAQPage } from './pages/FAQPage';
import { AuthModal } from './pages/AuthPage';
import { cartManager, wishlistManager, getProduct, formatPrice } from './data';
import AdminHome from './Admin/screens/Home';
import CustomersModern from './Admin/components/CustomersModern';
import CustomersModernPro from './Admin/components/CustomersModernPro';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState({});
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState(wishlistManager.get());
  const [showCart, setShowCart] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [compareProducts, setCompareProducts] = useState([]);

  const [orderHistory, setOrderHistory] = useState([]);
  const [profileTab, setProfileTab] = useState('wishlist');

  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/customers-modern';

  // Load cart with products on component mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const cartWithProducts = await cartManager.getWithProducts();
        setCart(cartWithProducts);
      } catch (error) {
        console.error('Error loading cart:', error);
        setCart([]);
      }
    };
    loadCart();
  }, []);

  const handleNavigate = (page, params = {}) => {
    if (page === 'home') navigate('/');
    else if (page === 'shop') navigate('/shop');
    else if (page === 'product') {
      // Use customerId from params if available, otherwise use productId
      const id = params.customerId || params.productId;
      navigate(`/customer/${id}`);
    }
    else if (page === 'compare') navigate('/compare');
    else if (page === 'profile') navigate('/profile');
    else if (page === 'checkout') navigate('/checkout');
    else if (page === 'about') navigate('/about');
    else if (page === 'contact') navigate('/contact');
    else if (page === 'faq') navigate('/faq');
    
    if (params.search) {
      setFilters({ search: params.search });
    }
    window.scrollTo(0, 0);
  };

  const addToCart = async (productId) => {
    cartManager.add(productId);
    const updatedCart = await cartManager.getWithProducts();
    setCart(updatedCart);
    showToast('Added to cart!');
  };

  const toggleWishlist = (productId) => {
    wishlistManager.toggle(productId);
    setWishlist(wishlistManager.get());
    showToast(wishlistManager.has(productId) ? 'Added to wishlist!' : 'Removed from wishlist!');
  };

  const toggleCart = () => {
    setShowCart(!showCart);
  };

  const filterByCategory = (categoryId) => {
    setFilters({ categoryId });
    navigate('shop');
  };

  const clearFilters = () => {
    setFilters({});
  };

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 bg-foreground text-white px-6 py-3 rounded-lg shadow-xl z-[9999] transition-all';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const updateCartQuantity = async (id, quantity) => {
    if (quantity < 1) {
      removeFromCart(id);
    } else {
      cartManager.update(id, quantity);
      const updatedCart = await cartManager.getWithProducts();
      setCart(updatedCart);
    }
  };

  const removeFromCart = async (id) => {
    cartManager.remove(id);
    const updatedCart = await cartManager.getWithProducts();
    setCart(updatedCart);
  };

  const checkout = () => {
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
    showToast('Order placed successfully! Total: ' + formatPrice(order.total));
    cartManager.clear();
    setCart([]);
    navigate('/');
  };

  const addToCompare = async (productId) => {
    const product = await getProduct(productId);
    if (!product) return;
    
    if (compareProducts.find(p => p.id === productId)) {
      showToast('Already in compare list');
      return;
    }
    
    if (compareProducts.length >= 3) {
      showToast('Maximum 3 products can be compared');
      return;
    }
    
    setCompareProducts([...compareProducts, product]);
    showToast('Added to compare');
  };

  const removeFromCompare = (productId) => {
    setCompareProducts(compareProducts.filter(p => p.id !== productId));
  };

  const clearCompare = () => {
    setCompareProducts([]);
  };

  const handleSignOut = () => {
    showToast('Signed out successfully!');
    navigate('/');
  };

  const ProductDetailsWrapper = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const loadProduct = async () => {
        try {
          const productData = await getProduct(parseInt(id));
          setProduct(productData);
        } catch (error) {
          console.error('Error loading product:', error);
        } finally {
          setLoading(false);
        }
      };
      loadProduct();
    }, [id]);

    if (loading) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">Loading product...</div>
        </div>
      );
    }

    return (
      <ProductDetailsPage 
        product={product}
        wishlist={wishlist}
        onAddToCart={addToCart}
        onToggleWishlist={toggleWishlist}
      />
    );
  };

  return (
    <div className="App">
      {!isAdminRoute && (
        <Navbar 
          currentPage=""
          cart={cart}
          wishlist={wishlist}
          onNavigate={handleNavigate}
          onToggleCart={toggleCart}
          onToggleAuth={() => setShowAuthModal(true)}
        />
      )}
      
      <main>
        <Routes>
          <Route path="/" element={
            <HomePage 
              compareProducts={compareProducts}
              onNavigate={handleNavigate}
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
              onAddToCompare={addToCompare}
              onFilterByCategory={filterByCategory}
            />
          } />
          
          <Route path="/shop" element={
            <ShopPage 
              filters={filters}
              compareProducts={compareProducts}
              onNavigate={handleNavigate}
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
              onAddToCompare={addToCompare}
              onFilterByCategory={filterByCategory}
              onClearFilters={clearFilters}
            />
          } />
          
          <Route path="/customer/:id" element={<ProductDetailsWrapper />} />
          <Route path="/product/:id" element={<ProductDetailsWrapper />} />
          
          <Route path="/compare" element={
            <ComparePage 
              compareProducts={compareProducts}
              onClear={clearCompare}
              onRemove={removeFromCompare}
              onAddToCart={addToCart}
              onNavigate={handleNavigate}
            />
          } />
          
          <Route path="/profile" element={
            <ProfilePage 
              wishlist={wishlist}
              orderHistory={orderHistory}
              profileTab={profileTab}
              setProfileTab={setProfileTab}
              compareProducts={compareProducts}
              onNavigate={handleNavigate}
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
              onAddToCompare={addToCompare}
              onSignOut={handleSignOut}
            />
          } />
          
          <Route path="/checkout" element={
            <CheckoutPage 
              cart={cart}
              onPlaceOrder={placeOrder}
              onNavigate={handleNavigate}
            />
          } />
          
          <Route path="/about" element={<AboutPage onNavigate={handleNavigate} />} />
          
          <Route path="/contact" element={
            <ContactPage onNavigate={handleNavigate} onFilterByCategory={filterByCategory} />
          } />
          
          <Route path="/faq" element={
            <FAQPage onNavigate={handleNavigate} onFilterByCategory={filterByCategory} />
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/dashboard" element={<AdminHome />} />
          <Route path="/admin-home" element={<AdminHome />} />
          <Route path="/customers-modern" element={<CustomersModern />} />
          <Route path="/customers-pro" element={<CustomersModernPro />} />
        </Routes>
      </main>
      
      {!isAdminRoute && (
        <>
          <AuthModal 
            showAuthModal={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
          
          <CartDrawer 
            showCart={showCart}
            cart={cart}
            onToggleCart={toggleCart}
            onUpdateQuantity={updateCartQuantity}
            onRemove={removeFromCart}
            onCheckout={checkout}
            onNavigate={handleNavigate}
          />
          
          <CompareBar 
            compareProducts={compareProducts}
            onRemove={removeFromCompare}
            onClear={clearCompare}
            onNavigate={handleNavigate}
          />
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <Router>
          <AppContent />
        </Router>
      </WishlistProvider>
    </CartProvider>
  );
}

export default App;
