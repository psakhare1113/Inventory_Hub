import { useState } from 'react';
import { authApi } from '../services/apiService';
import { toast } from '../components/Toast';

export const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await authApi.login(email, password);
      if (result && result.token) {
        if (!result.isAdmin) {
          toast.error('Access denied. Admin credentials required.');
          setLoading(false);
          return;
        }
        // Store admin session in sessionStorage (tab-specific) so customer login
        // in another tab cannot overwrite the admin token via shared localStorage.
        sessionStorage.setItem('adminToken', result.token);
        sessionStorage.setItem('adminRole', 'ADMIN');
        sessionStorage.setItem('adminId', result.customerId);
        sessionStorage.setItem('adminFirstName', result.firstName);
        sessionStorage.setItem('adminLastName', result.lastName);
        sessionStorage.setItem('adminUsername', result.email || email);
        sessionStorage.setItem('isAdminSession', 'true');

        // Also keep legacy localStorage keys so existing admin components that
        // still read from localStorage continue to work in the same tab.
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('userRole', 'ADMIN');
        localStorage.setItem('role', 'ADMIN');
        toast.success(`Welcome, ${result.firstName}! Redirecting to dashboard...`);
        setTimeout(() => { window.location.href = '/admin/dashboard'; }, 1000);
      } else {
        toast.error('Invalid credentials. Please try again.');
      }
    } catch {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/images/logo.png" alt="Logo" className="h-12 w-12 object-contain mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Inventory Hub — Staff only</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Admin Email</label>
              <input
                type="email"
                name="email"
                id="admin-email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="admin-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In to Admin'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <a href="/" className="text-xs text-gray-500 hover:text-primary transition-colors">
              ← Back to Store
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
