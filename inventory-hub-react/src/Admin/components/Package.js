import React, { useState } from 'react';
import '../css/Package.css';
import { FaPlus, FaFilePdf, FaFileExcel, FaTrash, FaEdit, FaTimes, FaFilter } from 'react-icons/fa';

const initialPackages = [
  {
    id: 1,
    date: "2024-01-15",
    customerName: "John Smith",
    status: "Delivered",
    trackingNumber: "PKG001",
    destination: "New York, NY",
    weight: "2.5 kg"
  },
  {
    id: 2,
    date: "2024-01-16",
    customerName: "Sarah Johnson",
    status: "In Transit",
    trackingNumber: "PKG002",
    destination: "Los Angeles, CA",
    weight: "1.8 kg"
  },
  {
    id: 3,
    date: "2024-01-17",
    customerName: "Mike Davis",
    status: "Pending",
    trackingNumber: "PKG003",
    destination: "Chicago, IL",
    weight: "3.2 kg"
  },
  {
    id: 4,
    date: "2024-01-18",
    customerName: "Emily Wilson",
    status: "Delivered",
    trackingNumber: "PKG004",
    destination: "Houston, TX",
    weight: "0.9 kg"
  },
  {
    id: 5,
    date: "2024-01-19",
    customerName: "David Brown",
    status: "Cancelled",
    trackingNumber: "PKG005",
    destination: "Phoenix, AZ",
    weight: "4.1 kg"
  }
];

const statusOptions = ["All", "Pending", "In Transit", "Delivered", "Cancelled"];

export default function Package() {
  const [packages, setPackages] = useState(initialPackages);
  const [filteredPackages, setFilteredPackages] = useState(initialPackages);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [formData, setFormData] = useState({
    customerName: '',
    destination: '',
    weight: '',
    status: 'Pending'
  });

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    if (status === "All") {
      setFilteredPackages(packages);
    } else {
      setFilteredPackages(packages.filter(pkg => pkg.status === status));
    }
  };

  const handleEdit = (id) => {
    const packageItem = packages.find(p => p.id === id);
    setEditingPackage(packageItem);
    setFormData({
      customerName: packageItem.customerName,
      destination: packageItem.destination,
      weight: packageItem.weight,
      status: packageItem.status
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this package?')) {
      const updatedPackages = packages.filter(pkg => pkg.id !== id);
      setPackages(updatedPackages);
      handleStatusFilter(statusFilter);
    }
  };

  const handleExportPDF = () => {
    const csvContent = filteredPackages.map(p => 
      `${p.id},${p.date},${p.customerName},${p.status},${p.trackingNumber},${p.destination},${p.weight}`
    ).join('\n');
    const blob = new Blob([`ID,Date,Customer Name,Status,Tracking Number,Destination,Weight\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'packages.csv';
    a.click();
  };

  const handleExportExcel = () => {
    const csvContent = filteredPackages.map(p => 
      `${p.id},${p.date},${p.customerName},${p.status},${p.trackingNumber},${p.destination},${p.weight}`
    ).join('\n');
    const blob = new Blob([`ID,Date,Customer Name,Status,Tracking Number,Destination,Weight\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'packages.xlsx';
    a.click();
  };

  const handleAddPackage = () => {
    setEditingPackage(null);
    setFormData({ customerName: '', destination: '', weight: '', status: 'Pending' });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPackage) {
      const updatedPackages = packages.map(p => 
        p.id === editingPackage.id 
          ? { ...p, ...formData }
          : p
      );
      setPackages(updatedPackages);
    } else {
      const newPackage = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        trackingNumber: `PKG${String(Date.now()).slice(-3)}`,
        ...formData
      };
      setPackages([...packages, newPackage]);
    }
    setShowModal(false);
    handleStatusFilter(statusFilter);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Pending': 'status-pending',
      'In Transit': 'status-transit',
      'Delivered': 'status-delivered',
      'Cancelled': 'status-cancelled'
    };
    return `status-badge ${statusClasses[status] || ''}`;
  };

  return (
    <div className="package-page">
      {/* Header */}
      <div className="package-header">
        <h2>Packages</h2>
        <button className="add-package-btn" onClick={handleAddPackage}>
          <FaPlus /> Add Package
        </button>
      </div>

      {/* Status Filter */}
      <div className="package-filter">
        <div className="filter-label">
          <FaFilter /> Filter by Status:
        </div>
        <select 
          className="status-dropdown"
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Card */}
      <div className="package-card">
        <div className="package-card-header">
          <h3>Package List ({filteredPackages.length})</h3>
          <div className="package-export-buttons">
            <button className="package-pdf-btn" onClick={handleExportPDF}>
              <FaFilePdf /> PDF
            </button>
            <button className="package-excel-btn" onClick={handleExportExcel}>
              <FaFileExcel /> Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="package-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Customer Name</th>
              <th>Status</th>
              <th>Tracking Number</th>
              <th>Destination</th>
              <th>Weight</th>
              <th className="package-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPackages.map((packageItem) => (
              <tr key={packageItem.id}>
                <td>#{packageItem.id}</td>
                <td>{packageItem.date}</td>
                <td>{packageItem.customerName}</td>
                <td>
                  <span className={getStatusBadge(packageItem.status)}>
                    {packageItem.status}
                  </span>
                </td>
                <td>{packageItem.trackingNumber}</td>
                <td>{packageItem.destination}</td>
                <td>{packageItem.weight}</td>
                <td className="package-action-col">
                  <div className="package-action-buttons">
                    <FaEdit 
                      className="package-edit-icon" 
                      onClick={() => handleEdit(packageItem.id)}
                      title="Edit Package"
                    />
                    <FaTrash 
                      className="package-delete-icon" 
                      onClick={() => handleDelete(packageItem.id)}
                      title="Delete Package"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingPackage ? 'Edit Package' : 'Add New Package'}</h3>
              <FaTimes className="close-btn" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit} className="package-form">
              <div className="form-group">
                <label htmlFor="customerName">Customer Name *</label>
                <input
                  id="customerName"
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="destination">Destination *</label>
                <input
                  id="destination"
                  type="text"
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  placeholder="Enter destination address"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="weight">Weight *</label>
                <input
                  id="weight"
                  type="text"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="Enter weight (e.g., 2.5 kg)"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="status">Status *</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Pending">Pending</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">
                  {editingPackage ? 'Update Package' : 'Add Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}