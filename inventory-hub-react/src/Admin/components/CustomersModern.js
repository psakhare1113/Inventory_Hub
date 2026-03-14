import React, { useState, useEffect } from 'react';
import '../css/Customers.css';
import { FaPlus, FaFilePdf, FaFileExcel, FaTrash, FaEdit, FaSearch, FaTh, FaList } from 'react-icons/fa';
import { adminService } from '../../services/adminApi';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  const [formData, setFormData] = useState({
    customerId: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || customer.role === filterRole;
    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const actualCustomers = [
        {
          id: 1,
          firstName: 'Pooja',
          lastName: 'Sakhare', 
          email: 'psakhare1113@gmail.com',
          phoneNumber: '+917757048900',
          role: 'USER',
          status: 'ACTIVE',
          createdAt: '2026-02-14 23:37:38.523020'
        },
        {
          id: 2,
          firstName: 'Pooja',
          lastName: 'Sakhare',
          email: 'test@gmail.com', 
          phoneNumber: '+917757048900',
          role: 'USER',
          status: 'ACTIVE',
          createdAt: '2026-02-15 22:40:36.706989'
        },
        {
          id: 3,
          firstName: 'Pooja',
          lastName: 'Sakhare',
          email: 'Pooja@gemail.com',
          phoneNumber: '+1234567890',
          role: 'USER', 
          status: 'ACTIVE',
          createdAt: '2026-02-19 21:48:19.379193'
        },
        {
          id: 4,
          firstName: 'Vedanti',
          lastName: 'Kole',
          email: 'Vedanti@gemail.com',
          phoneNumber: '+1234567890',
          role: 'USER',
          status: 'ACTIVE', 
          createdAt: '2026-02-19 21:49:28.462126'
        }
      ];
      
      setCustomers(actualCustomers);
      setError(null);
    } catch (err) {
      setError(err.message);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerId: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phoneNumber,
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      setCustomers(customers.filter(c => c.id !== customerId));
    }
  };

  const handleToggleRole = async (customerId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (window.confirm(`Change role to ${newRole}?`)) {
      setCustomers(customers.map(c => 
        c.id === customerId ? {...c, role: newRole} : c
      ));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({ customerId: '', name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '' });
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getAvatarColor = (id) => {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
    return colors[id % colors.length];
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center', fontSize: '18px'}}>Loading customers...</div>;

  return (
    <div style={{padding: '24px', background: '#f8fafc', minHeight: '100vh'}}>
      {/* Header */}
      <div style={{marginBottom: '32px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
          <div>
            <h1 style={{margin: 0, fontSize: '32px', fontWeight: '700', color: '#1a202c'}}>Customer Management</h1>
            <p style={{margin: '8px 0 0 0', color: '#718096', fontSize: '16px'}}>
              {filteredCustomers.length} customers found
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '14px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease'
            }}
          >
            <FaPlus /> Add Customer
          </button>
        </div>
        
        {/* Controls */}
        <div style={{
          display: 'flex', 
          gap: '16px', 
          alignItems: 'center', 
          background: 'white',
          padding: '20px',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{position: 'relative', flex: 1}}>
            <FaSearch style={{position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#a0aec0'}} />
            <input
              type="text"
              placeholder="Search customers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 44px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
            />
          </div>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '2px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
              background: 'white',
              minWidth: '120px'
            }}
          >
            <option value="all">All Roles</option>
            <option value="USER">Users</option>
            <option value="ADMIN">Admins</option>
          </select>
          
          <div style={{display: 'flex', background: '#f7fafc', borderRadius: '10px', padding: '4px'}}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                background: viewMode === 'grid' ? '#667eea' : 'transparent',
                color: viewMode === 'grid' ? 'white' : '#4a5568',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaTh /> Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                background: viewMode === 'table' ? '#667eea' : 'transparent',
                color: viewMode === 'table' ? 'white' : '#4a5568',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FaList /> Table
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '24px'
        }}>
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '28px',
                boxShadow: '0 4px 25px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 25px rgba(0,0,0,0.08)';
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: `linear-gradient(90deg, ${getAvatarColor(customer.id)}, ${getAvatarColor(customer.id + 1)})`
              }} />
              
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '20px'}}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${getAvatarColor(customer.id)}, ${getAvatarColor(customer.id + 1)})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: '700',
                  marginRight: '16px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}>
                  {getInitials(customer.firstName, customer.lastName)}
                </div>
                <div style={{flex: 1}}>
                  <h3 style={{margin: 0, fontSize: '20px', fontWeight: '600', color: '#1a202c'}}>
                    {customer.firstName} {customer.lastName}
                  </h3>
                  <p style={{margin: '4px 0 0 0', color: '#718096', fontSize: '14px', fontWeight: '500'}}>
                    ID: #{customer.id}
                  </p>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: customer.role === 'ADMIN' ? 'linear-gradient(135deg, #48bb78, #38a169)' : 'linear-gradient(135deg, #4299e1, #3182ce)',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {customer.role}
                  </span>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: customer.status === 'ACTIVE' ? '#c6f6d5' : '#fed7d7',
                    color: customer.status === 'ACTIVE' ? '#22543d' : '#742a2a',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {customer.status}
                  </span>
                </div>
              </div>
              
              <div style={{marginBottom: '24px', space: '16px'}}>
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '12px'}}>
                  <span style={{fontSize: '16px', marginRight: '8px'}}>📧</span>
                  <span style={{fontSize: '14px', color: '#4a5568', fontWeight: '500'}}>{customer.email}</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <span style={{fontSize: '16px', marginRight: '8px'}}>📱</span>
                  <span style={{fontSize: '14px', color: '#4a5568', fontWeight: '500'}}>{customer.phoneNumber}</span>
                </div>
              </div>
              
              <div style={{display: 'flex', gap: '8px'}}>
                <button
                  onClick={() => handleToggleRole(customer.id, customer.role)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    borderRadius: '10px',
                    background: customer.role === 'ADMIN' ? 'linear-gradient(135deg, #f56565, #e53e3e)' : 'linear-gradient(135deg, #4299e1, #3182ce)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {customer.role === 'ADMIN' ? '✓ Admin' : 'Make Admin'}
                </button>
                <button
                  onClick={() => handleEdit(customer)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #38b2ac, #319795)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDelete(customer.id)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f56565, #e53e3e)',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div style={{
          background: 'white',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 4px 25px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0'
        }}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <th style={{padding: '20px', color: 'white', fontWeight: '600', textAlign: 'left', fontSize: '14px'}}>Customer</th>
                <th style={{padding: '20px', color: 'white', fontWeight: '600', textAlign: 'left', fontSize: '14px'}}>Contact</th>
                <th style={{padding: '20px', color: 'white', fontWeight: '600', textAlign: 'left', fontSize: '14px'}}>Role</th>
                <th style={{padding: '20px', color: 'white', fontWeight: '600', textAlign: 'left', fontSize: '14px'}}>Status</th>
                <th style={{padding: '20px', color: 'white', fontWeight: '600', textAlign: 'center', fontSize: '14px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <tr 
                  key={customer.id}
                  style={{
                    background: index % 2 === 0 ? '#f8fafc' : 'white',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#edf2f7'}
                  onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? '#f8fafc' : 'white'}
                >
                  <td style={{padding: '20px'}}>
                    <div style={{display: 'flex', alignItems: 'center'}}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${getAvatarColor(customer.id)}, ${getAvatarColor(customer.id + 1)})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '600',
                        marginRight: '12px'
                      }}>
                        {getInitials(customer.firstName, customer.lastName)}
                      </div>
                      <div>
                        <div style={{fontWeight: '600', color: '#1a202c', fontSize: '16px'}}>
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div style={{color: '#718096', fontSize: '14px'}}>ID: #{customer.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding: '20px'}}>
                    <div style={{color: '#4a5568', fontSize: '14px', lineHeight: '1.5'}}>
                      <div style={{fontWeight: '500'}}>{customer.email}</div>
                      <div>{customer.phoneNumber}</div>
                    </div>
                  </td>
                  <td style={{padding: '20px'}}>
                    <span style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      background: customer.role === 'ADMIN' ? 'linear-gradient(135deg, #48bb78, #38a169)' : 'linear-gradient(135deg, #4299e1, #3182ce)',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {customer.role}
                    </span>
                  </td>
                  <td style={{padding: '20px'}}>
                    <span style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      background: customer.status === 'ACTIVE' ? '#c6f6d5' : '#fed7d7',
                      color: customer.status === 'ACTIVE' ? '#22543d' : '#742a2a',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {customer.status}
                    </span>
                  </td>
                  <td style={{padding: '20px', textAlign: 'center'}}>
                    <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                      <button
                        onClick={() => handleToggleRole(customer.id, customer.role)}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: customer.role === 'ADMIN' ? 'linear-gradient(135deg, #f56565, #e53e3e)' : 'linear-gradient(135deg, #4299e1, #3182ce)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        {customer.role === 'ADMIN' ? '✓ Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => handleEdit(customer)}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #38b2ac, #319795)',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        style={{
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #f56565, #e53e3e)',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
              <h3 style={{margin: 0, fontSize: '24px', fontWeight: '600', color: '#1a202c'}}>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button 
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#a0aec0'
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{display: 'grid', gap: '16px'}}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={{
                    padding: '14px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{
                    padding: '14px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  required
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  style={{
                    padding: '14px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{display: 'flex', gap: '12px', marginTop: '24px'}}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    background: 'white',
                    color: '#4a5568',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '14px',
                    border: 'none',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {editingCustomer ? 'Update' : 'Add'} Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}