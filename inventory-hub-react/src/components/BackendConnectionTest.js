import React, { useState } from 'react';

export const BackendConnectionTest = () => {
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);

  const testEndpoint = async (name, url, options = {}) => {
    try {
      const response = await fetch(url, {
        timeout: 5000,
        ...options
      });
      
      return {
        name,
        url,
        status: response.status,
        ok: response.ok,
        message: response.ok ? 'Connected' : `Error ${response.status}`
      };
    } catch (error) {
      return {
        name,
        url,
        status: 'ERROR',
        ok: false,
        message: error.message.includes('ERR_CONNECTION_REFUSED') 
          ? 'Service not running' 
          : error.message
      };
    }
  };

  const runTests = async () => {
    setTesting(true);
    const token = localStorage.getItem('token');
    
    const tests = [
      {
        name: 'Service Registry',
        url: 'http://localhost:8761/eureka/apps'
      },
      {
        name: 'API Gateway',
        url: 'http://localhost:9999/actuator/health'
      },
      {
        name: 'Auth Server',
        url: 'http://localhost:2000/actuator/health'
      },
      {
        name: 'Auth Server - Admin Customers',
        url: 'http://localhost:2000/api/auth/admin/customers',
        options: {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      }
    ];

    const results = {};
    for (const test of tests) {
      results[test.name] = await testEndpoint(test.name, test.url, test.options);
    }
    
    setTestResults(results);
    setTesting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Backend Connection Test</h3>
        <button
          onClick={runTests}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? 'Testing...' : 'Test Connections'}
        </button>
      </div>

      {Object.keys(testResults).length > 0 && (
        <div className="space-y-3">
          {Object.values(testResults).map((result, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <div className="font-medium text-gray-800">{result.name}</div>
                <div className="text-sm text-gray-600">{result.url}</div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  result.ok 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {result.status}
                </span>
                <span className="text-sm text-gray-600">{result.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <h4 className="font-medium text-blue-800 mb-2">Required Services:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Service Registry (port 8761) - Service discovery</li>
          <li>• API Gateway (port 9999) - Request routing</li>
          <li>• Auth Server (port 2000) - Authentication & user management</li>
        </ul>
      </div>
    </div>
  );
};