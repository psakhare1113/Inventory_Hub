import React, { useState, useEffect } from 'react';

export const AuthStatusChecker = () => {
  const [authStatus, setAuthStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkAuthStatus = async () => {
    setChecking(true);
    try {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      const customerId = localStorage.getItem('customerId');
      const firstName = localStorage.getItem('firstName');

      if (!token) {
        setAuthStatus({
          status: 'error',
          message: 'No authentication token found',
          details: 'Please login first'
        });
        return;
      }

      // Check if token looks like a real JWT (has 3 parts separated by dots)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        setAuthStatus({
          status: 'error',
          message: 'Invalid token format',
          details: 'Token is not a valid JWT. Please login again.'
        });
        return;
      }

      // Test token validity
      const response = await fetch('http://localhost:9999/api/auth/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAuthStatus({
          status: 'success',
          message: 'Authentication successful',
          details: {
            tokenValid: true,
            userId: data.id,
            email: data.email,
            role: data.role,
            firstName: data.firstName,
            lastName: data.lastName,
            canSwitchToAdmin: data.canSwitchToAdmin
          }
        });
      } else {
        setAuthStatus({
          status: 'error',
          message: `Authentication failed (${response.status})`,
          details: response.status === 401 ? 'Token expired or invalid. Please login again.' : 'Server error'
        });
      }
    } catch (error) {
      setAuthStatus({
        status: 'error',
        message: 'Connection error',
        details: 'Cannot connect to auth server on port 2000. Please ensure it is running.'
      });
    } finally {
      setChecking(false);
    }
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('customerId');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('currentView');
    setAuthStatus(null);
    alert('Authentication cleared. Please login again.');
    window.location.reload();
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">🔐 Authentication Status</h3>
        <div className="flex gap-2">
          <button
            onClick={checkAuthStatus}
            disabled={checking}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Check Auth'}
          </button>
          <button
            onClick={clearAuth}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            Clear Auth
          </button>
        </div>
      </div>

      {authStatus && (
        <div className={`p-3 rounded-md ${
          authStatus.status === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className={`font-medium ${
            authStatus.status === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {authStatus.message}
          </div>
          
          {authStatus.status === 'success' && authStatus.details && (
            <div className="mt-2 text-sm text-green-700">
              <div><strong>User ID:</strong> {authStatus.details.userId}</div>
              <div><strong>Email:</strong> {authStatus.details.email}</div>
              <div><strong>Name:</strong> {authStatus.details.firstName} {authStatus.details.lastName}</div>
              <div><strong>Role:</strong> <span className="font-semibold">{authStatus.details.role}</span></div>
              <div><strong>Can Access Admin:</strong> {authStatus.details.canSwitchToAdmin ? '✅ Yes' : '❌ No'}</div>
            </div>
          )}
          
          {authStatus.status === 'error' && (
            <div className="mt-2 text-sm text-red-700">
              <strong>Details:</strong> {authStatus.details}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        <div><strong>Stored Token:</strong> {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</div>
        <div><strong>Token Format:</strong> {localStorage.getItem('token')?.split('.').length === 3 ? '✅ Valid JWT' : '❌ Invalid'}</div>
        <div><strong>Stored Role:</strong> {localStorage.getItem('role') || 'Not set'}</div>
        <div><strong>Customer ID:</strong> {localStorage.getItem('customerId') || 'Not set'}</div>
      </div>
    </div>
  );
};