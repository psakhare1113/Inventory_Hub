import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, X } from 'lucide-react';

const AdminAuthorityModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [adminInfo, setAdminInfo] = useState({
    firstName: 'Admin',
    lastName: 'User'
  });

  useEffect(() => {
    // Check if admin just logged in
    const checkAdminLogin = () => {
      const token = localStorage.getItem('token');
      const isAdmin = localStorage.getItem('isAdmin') === 'true';
      const modalShown = sessionStorage.getItem('adminModalShown');
      
      if (token && isAdmin && !modalShown) {
        const firstName = localStorage.getItem('firstName') || 'Admin';
        const lastName = localStorage.getItem('lastName') || 'User';
        
        setAdminInfo({ firstName, lastName });
        setShowModal(true);
        
        // Mark modal as shown for this session
        sessionStorage.setItem('adminModalShown', 'true');
      }
    };

    checkAdminLogin();
  }, []);

  const closeModal = () => {
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-amber-500 p-6 text-white relative">
          <button 
            onClick={closeModal}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Shield size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">Admin Authority</h2>
              <p className="text-amber-100">Access Granted</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Welcome, {adminInfo.firstName} {adminInfo.lastName}!
            </h3>
            
            <p className="text-gray-600 mb-4">
              You have been granted administrator privileges for the Inventory Hub system.
            </p>
          </div>

          {/* Authority Features */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800">Full Dashboard Access</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-blue-800">User & Admin View Switching</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <CheckCircle size={20} className="text-purple-600 flex-shrink-0" />
              <span className="text-sm text-purple-800">Complete System Management</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={closeModal}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-amber-500 hover:to-amber-600 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthorityModal;