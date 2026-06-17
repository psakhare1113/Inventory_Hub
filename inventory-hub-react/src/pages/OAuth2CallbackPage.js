import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../components/Toast';

/**
 * OAuth2CallbackPage
 *
 * The backend redirects here after a successful Google login:
 *   http://localhost:3000/oauth2/callback?token=...&customerId=...&firstName=...&...
 *
 * This page reads the query params, stores them in localStorage (same as the
 * normal login flow), then redirects the user to the appropriate portal.
 */
const OAuth2CallbackPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing your login...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token        = params.get('token');
    const customerId   = params.get('customerId');
    const firstName    = params.get('firstName') || '';
    const lastName     = params.get('lastName')  || '';
    const email        = params.get('email')     || '';
    const role         = params.get('role')      || 'USER';
    const isAdmin      = params.get('isAdmin')   === 'true';
    const isDeliveryBoy = params.get('isDeliveryBoy') === 'true';
    const picture      = params.get('picture')   || '';
    const refreshToken = params.get('refreshToken') || '';  // ✅ NEW
    const expiresIn    = params.get('expiresIn')    || '';  // ✅ NEW

    if (!token) {
      setStatus('Login failed. No token received.');
      toast.error('Google login failed. Please try again.');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    // ── Store in localStorage (same keys as normal login) ──────────────────
    localStorage.setItem('authToken',   token);
    localStorage.setItem('token',       token);
    localStorage.setItem('userRole',    role);
    localStorage.setItem('role',        isAdmin ? 'ADMIN' : isDeliveryBoy ? 'DELIVERY_BOY' : 'CUSTOMER');
    localStorage.setItem('isAdmin',     String(isAdmin));
    localStorage.setItem('userId',      customerId);
    localStorage.setItem('customerId',  customerId);
    localStorage.setItem('firstName',   firstName);
    localStorage.setItem('lastName',    lastName);
    localStorage.setItem('userName',    `${firstName} ${lastName}`);
    localStorage.setItem('email',       email);
    if (picture) localStorage.setItem('userPicture', picture);
    // ✅ NEW: Store refresh token (same as password login)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('tokenExpiresIn', expiresIn);
    }

    // Migrate guest cart to user cart
    try {
      const guestCart = JSON.parse(localStorage.getItem('inventory_cart_guest') || '[]');
      if (guestCart.length > 0) {
        const userCartKey = `inventory_cart_${customerId}`;
        const existingUserCart = JSON.parse(localStorage.getItem(userCartKey) || '[]');
        const merged = [...existingUserCart];
        guestCart.forEach(guestItem => {
          const alreadyExists = merged.find(i => Number(i.productId) === Number(guestItem.productId));
          if (alreadyExists) {
            alreadyExists.quantity += guestItem.quantity;
          } else {
            merged.push(guestItem);
          }
        });
        localStorage.setItem(userCartKey, JSON.stringify(merged));
        localStorage.removeItem('inventory_cart_guest');
      }
    } catch (_) {}

    window.dispatchEvent(new Event('userLoggedIn'));

    // ── Redirect based on role ──────────────────────────────────────────────
    if (isAdmin) {
      toast.error('Please use the Admin Portal to sign in as admin.');
      setTimeout(() => { window.location.href = '/admin/login'; }, 1200);
    } else if (isDeliveryBoy) {
      toast.error('Delivery partners must use the Delivery Portal to sign in.');
      setTimeout(() => { window.location.href = '/delivery/login'; }, 1200);
    } else {
      localStorage.setItem('currentView', 'user');
      toast.success(`Welcome, ${firstName}! Signed in with Google.`);
      setTimeout(() => { window.location.href = '/'; }, 1000);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-600 text-sm font-medium">{status}</p>
      </div>
    </div>
  );
};

export default OAuth2CallbackPage;
