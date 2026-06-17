import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * useAuthGuard — wraps any action with an authentication check.
 *
 * Usage:
 *   const guard = useAuthGuard();
 *
 *   // In a click handler:
 *   guard(
 *     () => addToCart(productId),          // action to run if authenticated
 *     {
 *       message: 'Please sign in to add items to your cart.',
 *       redirectTo: '/cart',               // optional — where to go after login
 *     }
 *   );
 */
export const useAuthGuard = () => {
  const { isAuthenticated, openAuthModal } = useAuth();

  const guard = useCallback(
    (action, options = {}) => {
      if (isAuthenticated) {
        action();
      } else {
        openAuthModal({
          message: options.message || 'Please sign in to continue.',
          redirectTo: options.redirectTo || null,
          pendingAction: action,
        });
      }
    },
    [isAuthenticated, openAuthModal]
  );

  return guard;
};
