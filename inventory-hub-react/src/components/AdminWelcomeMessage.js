import React, { useState, useEffect } from 'react';

export const AdminWelcomeMessage = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const checkNewAdmin = () => {
      const isNewAdmin = localStorage.getItem('isNewAdmin');
      const firstName = localStorage.getItem('firstName');
      const lastName = localStorage.getItem('lastName');
      const role = localStorage.getItem('role');
      
      console.log('Checking for new admin:', { isNewAdmin, role, firstName, lastName });
      
      // Only show for users who are actually admins (not customers with wrong role)
      if (isNewAdmin === 'true' && role === 'ADMIN') {
        setUserName(`${firstName || ''} ${lastName || ''}`.trim());
        setShowWelcome(true);
        // Clear the flag after showing
        localStorage.removeItem('isNewAdmin');
      }
    };

    // Small delay to ensure all localStorage is set
    setTimeout(checkNewAdmin, 500);
  }, []);

  const handleClose = () => {
    setShowWelcome(false);
  };

  const switchToAdminView = () => {
    localStorage.setItem('currentView', 'admin');
    setShowWelcome(false);
    window.location.reload();
  };

  if (!showWelcome) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center shadow-2xl">
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🎉 Congratulations!</h2>
          <p className="text-lg text-gray-700 mb-4">
            Welcome <span className="font-semibold text-blue-600">{userName}</span>!
          </p>
          <p className="text-gray-600 mb-6">
            You have been <span className="font-semibold text-green-600">promoted to Admin</span>! 
            You now have access to both user and admin panels.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">🔥 Your New Admin Powers:</h3>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>• Access admin dashboard</li>
              <li>• Manage customers and users</li>
              <li>• View system analytics</li>
              <li>• Switch between User/Admin views</li>
            </ul>
          </div>
          
          <p className="text-sm text-gray-500 mb-6">
            Use the <span className="font-semibold">view switcher</span> in the navbar to switch between User and Admin modes.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Stay in User View
          </button>
          <button
            onClick={switchToAdminView}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium shadow-lg"
          >
            Go to Admin Panel 🚀
          </button>
        </div>
      </div>
    </div>
  );
};