import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { imsService } from '../../services/imsApi';

export default function Analytics() {
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('SALE');

  useEffect(() => {
    loadSalesData();
  }, [selectedType]);

  const loadSalesData = async () => {
    try {
      setLoading(true);
      const data = await imsService.inventory.getDailySales(selectedType);
      setSalesData(data || []);
      setError(null);
    } catch (err) {
      console.error('Analytics backend error:', err);
      setError('❌ Failed to load analytics: ' + err.message);
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  };

  const getTotalSales = () => {
    return salesData.reduce((total, item) => total + (item.salesCount || 0), 0);
  };

  const getTotalAmount = () => {
    return salesData.reduce((total, item) => total + (item.totalAmount || 0), 0);
  };

  if (loading) return <div className="p-6">Loading analytics from InventoryManagementSystem...</div>;

  return (
    <div className="admin" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={28} />
          Sales Analytics
        </h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="SALE">Sales</option>
            <option value="RETURN">Returns</option>
            <option value="DAMAGE">Damage</option>
          </select>
          <button
            onClick={loadSalesData}
            style={{
              padding: '8px 16px', backgroundColor: '#28a745', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px'
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '15px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb',
          borderRadius: '5px', marginBottom: '20px', color: '#721c24'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{
          padding: '20px', backgroundColor: 'white', borderRadius: '10px',
          border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <TrendingUp size={24} style={{ color: '#007bff' }} />
            <h3 style={{ margin: 0 }}>Total {selectedType.toLowerCase()}s</h3>
          </div>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#007bff' }}>
            {getTotalSales()}
          </p>
        </div>

        <div style={{
          padding: '20px', backgroundColor: 'white', borderRadius: '10px',
          border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Calendar size={24} style={{ color: '#28a745' }} />
            <h3 style={{ margin: 0 }}>Total Amount</h3>
          </div>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#28a745' }}>
            ₹{getTotalAmount().toLocaleString()}
          </p>
        </div>

        <div style={{
          padding: '20px', backgroundColor: 'white', borderRadius: '10px',
          border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <BarChart3 size={24} style={{ color: '#ffc107' }} />
            <h3 style={{ margin: 0 }}>Average per Day</h3>
          </div>
          <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#ffc107' }}>
            {salesData.length > 0 ? Math.round(getTotalSales() / salesData.length) : 0}
          </p>
        </div>
      </div>

      {/* Sales Data Table */}
      <div style={{
        backgroundColor: 'white', borderRadius: '10px',
        border: '1px solid #dee2e6', overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px', backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: 0 }}>Daily {selectedType} Data</h3>
        </div>

        <div style={{ padding: '20px' }}>
          {salesData.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Sales Count</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Total Amount</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Average Amount</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((sale, index) => (
                  <tr key={index}>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                      {sale.date || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                      {sale.salesCount || 0}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                      ₹{(sale.totalAmount || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                      ₹{sale.salesCount > 0 ? Math.round((sale.totalAmount || 0) / sale.salesCount) : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3>No {selectedType.toLowerCase()} data available</h3>
              <p>Sales data will appear here once transactions are recorded.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}