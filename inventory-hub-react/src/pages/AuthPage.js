import { useState } from 'react';
import { authApi } from '../services/apiService';
import { toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

/**
 * AuthModal
 *
 * Props:
 *   showAuthModal  — boolean
 *   onClose        — fn()
 *   authMessage    — optional friendly message shown at top (e.g. "Sign in to add to cart")
 *   redirectTo     — optional path to navigate after successful login
 *   pendingAction  — optional fn() to call after successful login (instead of page reload)
 */
export const AuthModal = ({ showAuthModal, onClose, authMessage, redirectTo, pendingAction }) => {
  const { refreshAuth } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: ''
  });

  // ── Password strength checker ─────────────────────────────────────────────
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    const checks = {
      length:    pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number:    /[0-9]/.test(pwd),
      special:   /[^A-Za-z0-9]/.test(pwd),
    };
    score = Object.values(checks).filter(Boolean).length;
    if (score <= 1) return { score, checks, label: 'Very Weak',  color: 'bg-red-500',    text: 'text-red-600' };
    if (score === 2) return { score, checks, label: 'Weak',       color: 'bg-orange-400', text: 'text-orange-600' };
    if (score === 3) return { score, checks, label: 'Fair',       color: 'bg-yellow-400', text: 'text-yellow-600' };
    if (score === 4) return { score, checks, label: 'Strong',     color: 'bg-blue-500',   text: 'text-blue-600' };
    return              { score, checks, label: 'Very Strong', color: 'bg-green-500',  text: 'text-green-600' };
  };

  const pwdStrength = getPasswordStrength(formData.password);

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const handleLoginSubmit = async () => {
    // Basic validation
    if (!formData.email.trim() || !formData.password.trim()) {
      toast.error('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.login(formData.email.trim(), formData.password);

      if (result && result.token) {
        // ── Store all auth data ──────────────────────────────────────────
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('token', result.token);
        const role = result.isAdmin ? 'ADMIN' : result.isDeliveryBoy ? 'DELIVERY_BOY' : 'USER';
        localStorage.setItem('userRole', role);
        localStorage.setItem('isAdmin', String(result.isAdmin || false));
        localStorage.setItem('role', result.isAdmin ? 'ADMIN' : result.isDeliveryBoy ? 'DELIVERY_BOY' : 'CUSTOMER');
        localStorage.setItem('userId', result.customerId);
        localStorage.setItem('customerId', result.customerId);
        localStorage.setItem('firstName', result.firstName || '');
        localStorage.setItem('lastName', result.lastName || '');
        localStorage.setItem('userName', `${result.firstName || ''} ${result.lastName || ''}`.trim());
        localStorage.setItem('email', result.email || formData.email);
        const phone = result.phone || result.phoneNumber || result.mobileNumber || result.mobile;
        if (phone) {
          localStorage.setItem('phone', phone);
          localStorage.setItem('mobileNumber', phone);
        }
        if (result.refreshToken) {
          localStorage.setItem('refreshToken', result.refreshToken);
          localStorage.setItem('tokenExpiresIn', result.expiresIn);
        }
        if (result.isAdmin && !localStorage.getItem('hasLoggedInAsAdmin')) {
          localStorage.setItem('isNewAdmin', 'true');
          localStorage.setItem('hasLoggedInAsAdmin', 'true');
        }

        // ── Role-based redirect ──────────────────────────────────────────
        if (result.isAdmin) {
          toast.error('Please use the Admin Portal to sign in as admin.');
          setLoading(false);
          setTimeout(() => { window.location.href = '/admin/login'; }, 1200);
          return;
        }

        if (result.isDeliveryBoy) {
          toast.error('Delivery partners must use the Delivery Portal to sign in.');
          setLoading(false);
          setTimeout(() => { window.location.href = '/delivery/login'; }, 1200);
          return;
        }

        // ── Regular customer login ───────────────────────────────────────
        localStorage.setItem('currentView', 'user');

        // Merge guest cart into user cart
        const guestCart = JSON.parse(localStorage.getItem('inventory_cart_guest') || '[]');
        if (guestCart.length > 0) {
          const userCartKey = `inventory_cart_${result.customerId}`;
          const existingUserCart = JSON.parse(localStorage.getItem(userCartKey) || '[]');
          const merged = [...existingUserCart];
          guestCart.forEach(guestItem => {
            const exists = merged.find(i => Number(i.productId) === Number(guestItem.productId));
            if (exists) exists.quantity += guestItem.quantity;
            else merged.push(guestItem);
          });
          localStorage.setItem(userCartKey, JSON.stringify(merged));
          localStorage.removeItem('inventory_cart_guest');
        }

        // Update AuthContext immediately — Navbar shows user avatar right away
        refreshAuth();
        window.dispatchEvent(new Event('userLoggedIn'));

        toast.success(`Welcome back, ${result.firstName}!`);
        onClose();

        // Run pending action (e.g. checkout) or redirect
        if (pendingAction) {
          setTimeout(() => { pendingAction(); }, 300);
        } else if (redirectTo) {
          setTimeout(() => { window.location.href = redirectTo; }, 600);
        }
        // No reload needed — refreshAuth() already updated the context

      } else if (result && result.emailNotVerified) {
        setPendingEmail(formData.email);
        setShowOtpScreen(true);
        toast.error('Please verify your email first. Sending new OTP...');
        await authApi.resendOtp(formData.email);

      } else if (result && result.error && result.error.toLowerCase().includes('locked')) {
        toast.error('🔒 Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.');

      } else {
        // Show the actual error from backend, or a generic message
        const msg = result?.error || result?.message || 'Invalid email or password. Please try again.';
        toast.error(msg);
      }
    } catch (err) {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER — Step 1: register → sends email OTP ───────────────────────
  const handleRegisterSubmit = async () => {
    // ── Password validation ──────────────────────────────────────────────
    if (!formData.password) {
      toast.error('Please enter a password.');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(formData.password)) {
      toast.error('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!/[a-z]/.test(formData.password)) {
      toast.error('Password must contain at least one lowercase letter (a-z).');
      return;
    }
    if (!/[0-9]/.test(formData.password)) {
      toast.error('Password must contain at least one number (0-9).');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(formData.password)) {
      toast.error('Password must contain at least one special character (!@#$%^&*).');
      return;
    }
    if (formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phone,
      };

      const result = await authApi.register(userData);
      if (result && (result.message || '').includes('OTP')) {
        toast.success('Account created! Check your email for the OTP.');
        localStorage.setItem('firstName', formData.firstName);
        localStorage.setItem('lastName', formData.lastName);
        localStorage.setItem('email', formData.email);
        localStorage.setItem('phone', formData.phone);
        localStorage.setItem('mobileNumber', formData.phone);
        setPendingEmail(formData.email);
        setShowOtpScreen(true);
        setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '' });
      } else {
        toast.error((result && (result.error || result.message)) || 'Registration failed. Please try again.');
      }
    } catch (err) {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // prevent double submit
    if (isLogin) await handleLoginSubmit();
    else await handleRegisterSubmit();
  };

  // ── Verify Email OTP (registration) ─────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    setOtpLoading(true);
    try {
      const result = await authApi.verifyOtp(pendingEmail, otp);
      if (result && result.message) {
        toast.success('Email verified! You can now sign in.');
        setShowOtpScreen(false);
        setOtp('');
        setIsLogin(true);
      } else {
        toast.error((result && result.error) || 'Invalid OTP. Please try again.');
      }
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      await authApi.resendOtp(pendingEmail);
      toast.success('New OTP sent to your email!');
    } catch {
      toast.error('Failed to resend OTP. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!showAuthModal) return null;

  // ── Email OTP Screen ──────────────────────────────────────────────────────
  if (showOtpScreen) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowOtpScreen(false)}>
        <div className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Verify Email</h2>
                <p className="mt-1 text-xs text-gray-600">Enter the 6-digit OTP sent to</p>
                <p className="text-xs font-semibold text-primary">{pendingEmail}</p>
              </div>
              <button onClick={() => setShowOtpScreen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full px-3 py-2 text-center text-2xl font-bold tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60"
              >
                {otpLoading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Didn't receive the OTP?{' '}
                <button onClick={handleResendOtp} className="text-primary font-semibold hover:underline">
                  Resend OTP
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-xl p-6 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
              <p className="mt-1 text-xs text-gray-600">{isLogin ? 'Sign in to your account' : 'Join us today'}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Friendly auth message (e.g. "Sign in to add to cart") */}
          {authMessage && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <span className="text-amber-500 text-base mt-0.5">🔒</span>
              <p className="text-xs text-amber-800 font-medium leading-snug">{authMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 py-1.5 text-sm border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: val });
                    }}
                    required
                    maxLength={10}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="10-digit mobile number"
                  />
                </div>
                {formData.phone.length > 0 && formData.phone.length < 10 && (
                  <p className="text-xs text-red-500 mt-1">{10 - formData.phone.length} more digits needed</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={isLogin ? 1 : 8}
                  className={`w-full px-3 py-1.5 pr-9 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                    !isLogin && formData.password && pwdStrength.score < 3
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder={isLogin ? '••••••••' : 'Min 8 chars, A-Z, 0-9, symbol'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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

              {/* ── Password strength meter (Sign Up only) ── */}
              {!isLogin && formData.password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {/* Strength bar */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= pwdStrength.score ? pwdStrength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-semibold ${pwdStrength.text}`}>
                    {pwdStrength.label}
                  </p>
                  {/* Checklist */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {[
                      { key: 'length',    label: 'Min 8 characters' },
                      { key: 'uppercase', label: 'Uppercase (A-Z)' },
                      { key: 'lowercase', label: 'Lowercase (a-z)' },
                      { key: 'number',    label: 'Number (0-9)' },
                      { key: 'special',   label: 'Special char (!@#$)' },
                    ].map(({ key, label }) => (
                      <span key={key} className={`text-[10px] flex items-center gap-1 ${pwdStrength.checks?.[key] ? 'text-green-600' : 'text-gray-400'}`}>
                        {pwdStrength.checks?.[key] ? '✓' : '○'} {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isLogin && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center">
                  <input type="checkbox" className="w-3 h-3 text-primary border-gray-300 rounded focus:ring-primary" />
                  <span className="ml-1.5 text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-primary hover:text-primary/80 font-medium">Forgot password?</a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { window.location.href = 'http://localhost:2000/oauth2/authorization/google'; }}
              className="flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-xs font-medium text-gray-700">Google</span>
            </button>
            <button className="flex items-center justify-center px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
              <svg className="w-4 h-4 mr-1.5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-xs font-medium text-gray-700">Facebook</span>
            </button>
          </div>

          {/* Toggle */}
          <div className="text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setShowOtpScreen(false); }}
              className="text-xs text-gray-600"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-primary font-semibold hover:underline">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
