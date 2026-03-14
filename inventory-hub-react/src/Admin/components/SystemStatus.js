import React, { useState, useEffect } from 'react';

export default function SystemStatus() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const serviceEndpoints = [
    { name: 'Auth Server', url: 'http://localhost:2000/actuator/health', port: 2000 },
    { name: 'Customer Service', url: 'http://localhost:9093/actuator/health', port: 9093 },
    { name: 'Product Service', url: 'http://localhost:9094/actuator/health', port: 9094 },
    { name: 'Order Service', url: 'http://localhost:9095/actuator/health', port: 9095 },
    { name: 'Inventory Service', url: 'http://localhost:9096/actuator/health', port: 9096 },
    { name: 'Payment Service', url: 'http://localhost:9097/actuator/health', port: 9097 },
    { name: 'Notification Service', url: 'http://localhost:9098/actuator/health', port: 9098 }
  ];

  useEffect(() => {
    checkServices();
    const interval = setInterval(checkServices, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkServices = async () => {
    setLoading(true);
    const results = [];

    for (const service of serviceEndpoints) {
      try {
        const response = await fetch(service.url, { 
          method: 'GET',
          mode: 'cors',
          timeout: 5000
        });
        
        results.push({
          ...service,
          status: response.ok ? 'UP' : 'DOWN',
          statusCode: response.status,
          error: null
        });
      } catch (error) {
        results.push({
          ...service,
          status: 'DOWN',
          statusCode: null,
          error: error.message
        });
      }
    }

    setServices(results);
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'UP': return '#28a745';
      case 'DOWN': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>System Status</h2>
        <button 
          onClick={checkServices}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Service</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Port</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Response Code</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Error</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{service.name}</td>
                <td style={{ padding: '12px' }}>{service.port}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: getStatusColor(service.status),
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {service.status}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{service.statusCode || 'N/A'}</td>
                <td style={{ padding: '12px', color: '#dc3545', fontSize: '12px' }}>
                  {service.error || 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Quick Fix Instructions:</h4>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>Make sure all Spring Boot services are running</li>
          <li>Add CORS configuration to each service</li>
          <li>Check if ports are not blocked by firewall</li>
          <li>Verify database connections</li>
        </ul>
      </div>
    </div>
  );
}