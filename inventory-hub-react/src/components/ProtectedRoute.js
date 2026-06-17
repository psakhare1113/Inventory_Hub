import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute - Role-based route guard
 *
 * requiredRole="ADMIN"  → only server-verified admins can access
 * requiredRole="USER"   → any logged-in user
 * no requiredRole       → any logged-in user
 *
 * NOTE: userRole must come from server verification (App.js checkUserRole),
 * NOT from raw localStorage — otherwise anyone can bypass with DevTools.
 */
export const ProtectedRoute = ({ children, requiredRole, userRole }) => {
  const location = useLocation();

  // For admin routes, prefer the tab-specific sessionStorage token so that a
  // customer login in another tab cannot invalidate the admin session.
  const token = requiredRole === 'ADMIN'
    ? (sessionStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('authToken'))
    : (localStorage.getItem('token') || localStorage.getItem('authToken'));

  // No token at all — send to home
  if (!token) {
    return <Navigate to="/" state={{ from: location, authRequired: true }} replace />;
  }

  // Admin-only route — must have server-verified ADMIN role
  if (requiredRole === 'ADMIN' && userRole !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};
