import React, { useState } from 'react';
import { authService } from '../services/imsApi';

const AdminPromotion = () => {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePromoteUser = async (e) => {
    e.preventDefault();
    if (!userId.trim()) {
      setMessage('❌ Please enter a valid User ID');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await authService.promoteToAdmin(parseInt(userId));
      
      if (result.error) {
        setMessage(`❌ ${result.error}`);
      } else {
        setMessage(`✅ User ${userId} has been promoted to Admin successfully!`);
        setUserId('');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Only show this component if user is admin
  if (!authService.isAdmin()) {
    return null;
  }

  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      margin: '20px 0'
    }}>
      <h3 style={{ marginBottom: '15px', color: '#dc2626' }}>
        👑 Admin Promotion Panel
      </h3>
      
      <form onSubmit={handlePromoteUser} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            User ID to Promote:
          </label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter User ID"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            disabled={loading}
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: loading ? '#9ca3af' : '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          {loading ? 'Promoting...' : 'Promote to Admin'}
        </button>
      </form>
      
      {message && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          borderRadius: '4px',
          background: message.includes('✅') ? '#dcfce7' : '#fee2e2',
          color: message.includes('✅') ? '#166534' : '#dc2626',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}
      
      <div style={{
        marginTop: '15px',
        padding: '10px',
        background: '#f3f4f6',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#6b7280'
      }}>
        <strong>Note:</strong> Once promoted, the user will have admin access to all inventory, products, and order management features. 
        Their API calls will automatically switch to admin endpoints.
      </div>
    </div>
  );
};

export default AdminPromotion;