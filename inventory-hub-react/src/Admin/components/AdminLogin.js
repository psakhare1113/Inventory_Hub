import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/apiConfig';
import '../css/AdminLogin.css';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const navigate = useNavigate();

  const handleSetupAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/setup-admin', credentials);
      alert('Admin created successfully! You can now login.');
      setShowSetup(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', credentials.email);
      const response = await api.post('/api/auth/token', credentials);
      console.log('Login response:', response.data);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);
        localStorage.setItem('username', credentials.email);
        
        if (response.data.role === 'ADMIN') {
          console.log('Admin login successful, redirecting...');
          navigate('/admin/dashboard');
        } else {
          setError('Access denied. Admin privileges required.');
          localStorage.clear();
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please check credentials.';
      setError(errorMessage);
      
      // If user not found, show setup option
      if (errorMessage.includes('not found') || errorMessage.includes('Invalid email')) {
        setShowSetup(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <h2>{showSetup ? 'Setup Admin' : 'Admin Login'}</h2>
        <form onSubmit={showSetup ? handleSetupAdmin : handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {showSetup && (
            <div className="info-message">
              No admin found. Click below to create the first admin account.
            </div>
          )}
          <button type="submit" disabled={loading}>
            {loading ? (showSetup ? 'Creating...' : 'Logging in...') : (showSetup ? 'Create Admin' : 'Login')}
          </button>
          {showSetup && (
            <button type="button" onClick={() => setShowSetup(false)} style={{ marginTop: '10px', background: '#666' }}>
              Back to Login
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
