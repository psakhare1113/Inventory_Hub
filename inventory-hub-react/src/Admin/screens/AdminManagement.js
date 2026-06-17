import React, { useState, useEffect } from 'react';
import AdminPromotion from '../../components/AdminPromotion';
import { RoleSwitchingGuide } from '../../components/RoleSwitchingGuide';
import { ServiceStatus } from '../../components/ServiceStatus';
import { adminApi } from '../../services/adminApi';

const AdminManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.customers.getAllCustomers();
      setCustomers(data);
      setMessage('');
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (error.message.includes('ERR_CONNECTION_REFUSED')) {
        setMessage('❌ Backend service is not running. Please start the auth-server on port 2000.');
      } else {
        setMessage('❌ Network error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateCustomerRole = async (customerId, newRole) => {
    setUpdating(true);
    try {
      const data = await adminApi.customers.updateCustomerRole(customerId, newRole);
      setMessage(`✅ ${data.message}`);
      fetchCustomers(); // Refresh the list
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating role:', error);
      setMessage(`❌ ${error.message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
          <p className="mt-2 text-gray-600">Manage user roles and permissions</p>
        </div>

        <RoleSwitchingGuide />
        
        <ServiceStatus />

        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.startsWith('✅') 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Promotion Section */}
          <div className="lg:col-span-1">
            <AdminPromotion />
          </div>

          {/* Customer List Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">All Customers</h3>
                  <p className="text-sm text-gray-600">Manage customer roles and permissions</p>
                </div>
                <button
                  onClick={fetchCustomers}
                  disabled={loading || updating}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <svg className={`w-4 h-4 ${loading || updating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {customer.firstName} {customer.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {customer.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.role === 'ADMIN' 
                              ? 'bg-red-100 text-red-800'
                              : customer.role === 'MANAGER'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {customer.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {customer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {customer.role !== 'ADMIN' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to make ${customer.firstName} ${customer.lastName} an Admin?`)) {
                                    updateCustomerRole(customer.id, 'ADMIN');
                                  }
                                }}
                                disabled={updating}
                                className="text-red-600 hover:text-red-900 text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ⚡ Make Admin
                              </button>
                            )}
                            {customer.role !== 'MANAGER' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to make ${customer.firstName} ${customer.lastName} a Manager?`)) {
                                    updateCustomerRole(customer.id, 'MANAGER');
                                  }
                                }}
                                disabled={updating}
                                className="text-yellow-600 hover:text-yellow-900 text-xs bg-yellow-50 hover:bg-yellow-100 px-3 py-1.5 rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                💼 Make Manager
                              </button>
                            )}
                            {customer.role !== 'USER' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to make ${customer.firstName} ${customer.lastName} a regular User?`)) {
                                    updateCustomerRole(customer.id, 'USER');
                                  }
                                }}
                                disabled={updating}
                                className="text-green-600 hover:text-green-900 text-xs bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                👤 Make User
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;