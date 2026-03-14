import React, { useState, useEffect } from 'react';
import { icons } from '../utils/icons';

export const Navbar = ({ currentPage, cart, wishlist, onNavigate, onToggleCart, onToggleAuth }) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const customerId = localStorage.getItem('customerId');
    const firstName = localStorage.getItem('firstName');
    const lastName = localStorage.getItem('lastName');
    if (token && customerId) {
      setUser({ customerId, token, firstName, lastName });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('customerId');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    setUser(null);
    setShowUserMenu(false);
    window.location.reload();
  };

  const getAvatarColor = (id) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-emerald-500 to-emerald-600', 
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-rose-500 to-rose-600',
      'bg-gradient-to-br from-amber-500 to-amber-600',
      'bg-gradient-to-br from-cyan-500 to-cyan-600'
    ];
    return colors[id % colors.length];
  };

  const getInitials = () => {
    if (!user?.firstName || !user?.lastName) return 'U';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    onNavigate('shop', { search: searchQuery });
    setShowSearch(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-nav border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-2xl font-serif font-bold text-foreground cursor-pointer" onClick={() => onNavigate('home')}>
              <img src="/images/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
              Inventory Hub
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-8">
            <a onClick={() => onNavigate('home')} className={`text-sm font-medium hover:text-primary transition-colors cursor-pointer ${currentPage === 'home' ? 'text-primary' : ''}`}>Home</a>
            <a onClick={() => onNavigate('shop')} className={`text-sm font-medium hover:text-primary transition-colors cursor-pointer ${currentPage === 'shop' ? 'text-primary' : ''}`}>Shop All</a>
            <a onClick={() => onNavigate('about')} className={`text-sm font-medium hover:text-primary transition-colors cursor-pointer ${currentPage === 'about' ? 'text-primary' : ''}`}>About</a>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {showSearch ? (
              <form onSubmit={handleSearch} className="flex items-center animate-in fade-in">
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  className="w-[150px] sm:w-[200px] h-9 px-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="button" onClick={() => setShowSearch(false)} className="p-2 hover:text-primary">
                  <span dangerouslySetInnerHTML={{ __html: icons.close }} />
                </button>
              </form>
            ) : (
              <button onClick={() => setShowSearch(true)} className="p-2 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
            {user ? (
              <div className="relative hidden sm:block">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full ${getAvatarColor(user.customerId)} text-white flex items-center justify-center font-semibold text-sm`}>
                    {getInitials()}
                  </div>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-semibold"><span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Hi! {user.firstName} {user.lastName}</span></p>
                    </div>
                    <button 
                      onClick={() => { onNavigate('profile'); setShowUserMenu(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={onToggleAuth} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all font-medium text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Sign In
              </button>
            )}
            <button onClick={() => onNavigate('profile')} className="relative p-2 hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlist.length > 0 && <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">{wishlist.length}</span>}
            </button>
            <button onClick={onToggleCart} className="relative p-2 hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cart.length > 0 && <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
