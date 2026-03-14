import React, { useState, useEffect } from 'react';

export default function CustomerTest() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDirectConnection = async () => {
    addLog('Testing direct Spring Boot connection...');
    
    try {
      const response = await fetch('http://localhost:2000/api/auth/admin/customers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token'
        }
      });
      
      addLog(`Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addLog(`Data received: ${JSON.stringify(data)}`);
        setCustomers(data);
        setError(null);
      } else {
        const errorText = await response.text();
        addLog(`Error response: ${errorText}`);
        setError(`Server error: ${response.status}`);
      }
    } catch (err) {
      addLog(`Connection error: ${err.message}`);
      setError(err.message);
    }
  };

  const testWithoutAuth = async () => {
    addLog('Testing without authentication...');
    
    try {
      const response = await fetch('http://localhost:2000/api/auth/isAdmin?email=test@example.com');
      addLog(`Auth test response: ${response.status}`);
      
      if (response.ok) {
        addLog('✅ Spring Boot server is running');
      } else {
        addLog('❌ Spring Boot server issue');
      }
    } catch (err) {
      addLog(`❌ Cannot connect to Spring Boot: ${err.message}`);
    }
  };

  useEffect(() => {
    testWithoutAuth();
    testDirectConnection();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Customer Data Debug Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testDirectConnection} style={{ marginRight: '10px', padding: '10px' }}>
          Test Direct Connection
        </button>
        <button onClick={testWithoutAuth} style={{ padding: '10px' }}>
          Test Server Status
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Debug Logs:</h3>
        <div style={{ background: '#f5f5f5', padding: '10px', height: '200px', overflow: 'auto' }}>
          {logs.map((log, index) => (
            <div key={index} style={{ fontSize: '12px', marginBottom: '5px' }}>
              {log}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      <div>
        <h3>Customer Data ({customers.length} records):</h3>
        {customers.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>First Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Last Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Email</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Phone</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Role</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => (
                <tr key={customer.id || index}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.id}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.firstName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.lastName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.email}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.phoneNumber}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.role}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{customer.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No customer data found</p>
        )}
      </div>
    </div>
  );
}