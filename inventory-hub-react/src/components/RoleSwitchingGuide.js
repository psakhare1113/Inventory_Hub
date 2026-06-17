import React from 'react';

export const RoleSwitchingGuide = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-blue-800 mb-3">🔄 Role Switching Feature</h3>
      
      <div className="space-y-3 text-sm text-blue-700">
        <div>
          <h4 className="font-medium">How it works:</h4>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Users with ADMIN role can switch between User View and Admin View</li>
            <li>The role switcher appears in the top-right corner for admins</li>
            <li>User View: Shows the customer-facing e-commerce interface</li>
            <li>Admin View: Shows the admin dashboard with management tools</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium">To promote a user to admin:</h4>
          <ol className="list-decimal list-inside ml-4 space-y-1">
            <li>Go to Admin Management (in admin view)</li>
            <li>Use the "Promote User to Admin" form</li>
            <li>Enter the user's email address</li>
            <li>Click "Promote to Admin"</li>
          </ol>
        </div>
        
        <div>
          <h4 className="font-medium">Managing roles:</h4>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>View all customers in the customer table</li>
            <li>Change roles using the action buttons (Make Admin, Make Manager, Make User)</li>
            <li>Changes take effect immediately</li>
          </ul>
        </div>
      </div>
    </div>
  );
};