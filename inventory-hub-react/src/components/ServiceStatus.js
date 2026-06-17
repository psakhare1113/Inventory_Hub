import React, { useState } from 'react';

export const ServiceStatus = () => {
  const [testingAuth, setTestingAuth] = useState(false);
  const [authResult, setAuthResult] = useState(null);

  const testAuthService = async () => {
    setTestingAuth(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:9999/api/auth/admin/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setAuthResult({
        status: response.status,
        ok: response.ok,
        message: response.ok ? 'Auth service working!' : `Error: ${response.status}`
      });
    } catch (error) {
      setAuthResult({
        status: 'ERROR',
        ok: false,
        message: error.message.includes('ERR_CONNECTION_REFUSED') 
          ? 'Auth service not running on port 2000' 
          : error.message
      });
    } finally {
      setTestingAuth(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Status</h3>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Required Services:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span>🔧 Service Registry</span>
              <span className="text-blue-600">Port 8761</span>
            </div>
            <div className="flex justify-between items-center">
              <span>🌐 API Gateway</span>
              <span className="text-blue-600">Port 9999</span>
            </div>
            <div className="flex justify-between items-center">
              <span>🔐 Auth Server</span>
              <span className="text-blue-600">Port 2000</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 border rounded-md">
          <div>
            <div className="font-medium text-gray-800">Auth Service Test</div>
            <div className="text-sm text-gray-600">Test role management functionality</div>
          </div>
          <div className="flex items-center space-x-3">
            {authResult && (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                authResult.ok 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {authResult.status}
              </span>
            )}
            <button
              onClick={testAuthService}
              disabled={testingAuth}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {testingAuth ? 'Testing...' : 'Test'}
            </button>
          </div>
        </div>

        {authResult && (
          <div className={`p-3 rounded-md text-sm ${
            authResult.ok 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {authResult.message}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded-md">
        <h4 className="font-medium text-yellow-800 mb-2">Start Services:</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <div>1. <code className="bg-yellow-100 px-1 rounded">cd service-registry && mvn spring-boot:run</code></div>
          <div>2. <code className="bg-yellow-100 px-1 rounded">cd auth-server && mvn spring-boot:run</code></div>
          <div>3. <code className="bg-yellow-100 px-1 rounded">cd api-gateway && mvn spring-boot:run</code></div>
        </div>
      </div>
    </div>
  );
};