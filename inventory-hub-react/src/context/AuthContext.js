import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * AuthContext — single source of truth for customer authentication state.
 *
 * Provides:
 *   isAuthenticated  — boolean
 *   user             — { customerId, firstName, lastName, token, role } | null
 *   openAuthModal    — fn(options?) opens the sign-in modal
 *   closeAuthModal   — fn()
 *   authModalState   — { open, message, redirectTo, pendingAction }
 *   refreshAuth      — fn() re-reads localStorage (call after login)
 *   logout           — fn() clears all auth storage and resets state
 */

const AuthContext = createContext(null);

const WAREHOUSE_ROLES = ['WAREHOUSE_MANAGER', 'RECEIVING', 'AUDITOR', 'PICKER', 'PACKER', 'SHIPPING', 'VIEWER'];

function readUserFromStorage() {
  const token = localStorage.getItem('token');
  const customerId = localStorage.getItem('customerId');
  const firstName = localStorage.getItem('firstName') || '';
  const lastName = localStorage.getItem('lastName') || '';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const role = localStorage.getItem('userRole') || 'USER';

  // Admin / delivery / warehouse logins must NOT count as customer auth
  if (isAdmin || role === 'DELIVERY_BOY' || WAREHOUSE_ROLES.includes(role)) {
    return null;
  }

  if (token && customerId) {
    return { customerId, firstName, lastName, token, role };
  }
  return null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readUserFromStorage());
  const [authModalState, setAuthModalState] = useState({
    open: false,
    message: '',
    redirectTo: null,
    pendingAction: null,
  });

  const refreshAuth = useCallback(() => {
    setUser(readUserFromStorage());
  }, []);

  // Keep in sync with storage events and custom login/logout events
  useEffect(() => {
    const handler = () => refreshAuth();
    window.addEventListener('userLoggedIn', handler);
    window.addEventListener('userLoggedOut', handler);
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    return () => {
      window.removeEventListener('userLoggedIn', handler);
      window.removeEventListener('userLoggedOut', handler);
      window.removeEventListener('storage', handler);
      window.removeEventListener('focus', handler);
    };
  }, [refreshAuth]);

  const openAuthModal = useCallback((options = {}) => {
    setAuthModalState({
      open: true,
      message: options.message || 'Please sign in to continue.',
      redirectTo: options.redirectTo || null,
      pendingAction: options.pendingAction || null,
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalState(s => ({ ...s, open: false }));
  }, []);

  /**
   * logout — clears all customer auth keys from localStorage/sessionStorage,
   * resets user state, and fires 'userLoggedOut' so all components update.
   */
  const logout = useCallback(() => {
    const customerId = localStorage.getItem('customerId') || 'guest';

    // Clear per-customer cart/wishlist
    localStorage.removeItem(`inventory_cart_${customerId}`);
    localStorage.removeItem(`inventory_wishlist_${customerId}`);

    // Clear all auth keys
    const authKeys = [
      'token', 'authToken', 'refreshToken', 'tokenExpiresIn',
      'isAdmin', 'currentView', 'username', 'userName',
      'customerId', 'userId', 'firstName', 'lastName',
      'userRole', 'role', 'email', 'phone', 'mobileNumber',
      'isNewAdmin', 'hasLoggedInAsAdmin',
    ];
    authKeys.forEach(k => localStorage.removeItem(k));

    sessionStorage.removeItem('adminSession');
    sessionStorage.removeItem('adminUsername');

    setUser(null);
    window.dispatchEvent(new Event('userLoggedOut'));
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      refreshAuth,
      logout,
      openAuthModal,
      closeAuthModal,
      authModalState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
