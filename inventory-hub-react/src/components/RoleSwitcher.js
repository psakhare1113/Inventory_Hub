import React, { useState, useEffect } from 'react';
import { authService, updateUserRole } from '../services/imsApi';

const RoleSwitcher = ({ onRoleChange }) => {
  const [currentRole, setCurrentRole] = useState('USER');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Get initial role
    const role = authService.getCurrentRole();
    setCurrentRole(role);
    setIsAdmin(role === 'ADMIN');

    // Listen for role changes
    const handleRoleChange = (event) => {
      const newRole = event.detail.newRole;
      setCurrentRole(newRole);
      setIsAdmin(newRole === 'ADMIN');
      if (onRoleChange) {
        onRoleChange(newRole);
      }
    };

    window.addEventListener('roleChanged', handleRoleChange);

    return () => {
      window.removeEventListener('roleChanged', handleRoleChange);
    };
  }, [onRoleChange]);

  const getRoleColor = () => {
    return isAdmin ? '#dc2626' : '#059669';
  };

  const getRoleIcon = () => {
    return isAdmin ? '👑' : '👤';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      backgroundColor: getRoleColor(),
      color: 'white',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <span>{getRoleIcon()}</span>
      <span>{currentRole}</span>
      {isAdmin && (
        <span style={{
          fontSize: '10px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          padding: '2px 6px',
          borderRadius: '10px'
        }}>
          ADMIN ACCESS
        </span>
      )}
    </div>
  );
};

export default RoleSwitcher;