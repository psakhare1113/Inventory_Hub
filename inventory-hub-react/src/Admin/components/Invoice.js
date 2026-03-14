import React, { useState } from 'react';
import '../css/Invoice.css';
import { FaPlus, FaFilePdf, FaFileExcel, FaTrash, FaEdit, FaTimes, FaFilter } from 'react-icons/fa';

const initialInvoices = [
  {
    id: 1,
    invoiceNumber: "INV-001",
    customerName: "John Smith",
    amount: 1250.00,
    tax: 125.00,
    dueDate: "2024-02-15",
    status: "Paid"
  },
  {
    id: 2,
    invoiceNumber: "INV-002",
    customerName: "Sarah Johnson",
    amount: 850.00,
    tax: 85.00,
    dueDate: "2024-02-20",
    status: "Pending"
  },
  {
    id: 3,
    invoiceNumber: "INV-003",
    customerName: "Mike Davis",
    amount: 2100.00,
    tax: 210.00,
    dueDate: "2024-02-10",
    status: "Overdue"
  },
  {
    id: 4,
    invoiceNumber: "INV-004",
    customerName: "Emily Wilson",
    amount: 675.00,
    tax: 67.50,
    dueDate: "2024-02-25",
    status: "Draft"
  },
  {
    id: 5,
    invoiceNumber: "INV-005",
    customerName: "David Brown",
    amount: 1800.00,
    tax: 180.00,
    dueDate: "2024-02-18",
    status: "Paid"
  }
];

const statusOptions = ["All", "Draft", "Pending", "Paid", "Overdue"];

export default function Invoice() {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filteredInvoices, setFilteredInvoices] = useState(initialInvoices);
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [formData, setFormData] = useState({
    customerName: '',
    amount: '',
    tax: '',
    dueDate: '',
    status: 'Draft'
  });

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    if (status === "All") {
      setFilteredInvoices(invoices);
    } else {
      setFilteredInvoices(invoices.filter(inv => inv.status === status));
    }
  };

  const handleEdit = (id) => {
    const invoice = invoices.find(i => i.id === id);
    setEditingInvoice(invoice);
    setFormData({
      customerName: invoice.customerName,
      amount: invoice.amount,
      tax: invoice.tax,
      dueDate: invoice.dueDate,
      status: invoice.status
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      const updatedInvoices = invoices.filter(inv => inv.id !== id);
      setInvoices(updatedInvoices);
      handleStatusFilter(statusFilter);
    }
  };

  const handleExportPDF = () => {
    const csvContent = filteredInvoices.map(i => 
      `${i.invoiceNumber},${i.customerName},${i.amount},${i.tax},${i.dueDate},${i.status}`
    ).join('\n');
    const blob = new Blob([`Invoice #,Customer Name,Amount,Tax,Due Date,Status\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices.csv';
    a.click();
  };

  const handleExportExcel = () => {
    const csvContent = filteredInvoices.map(i => 
      `${i.invoiceNumber},${i.customerName},${i.amount},${i.tax},${i.dueDate},${i.status}`
    ).join('\n');
    const blob = new Blob([`Invoice #,Customer Name,Amount,Tax,Due Date,Status\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices.xlsx';
    a.click();
  };

  const handleAddInvoice = () => {
    setEditingInvoice(null);
    setFormData({ customerName: '', amount: '', tax: '', dueDate: '', status: 'Draft' });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingInvoice) {
      const updatedInvoices = invoices.map(i => 
        i.id === editingInvoice.id 
          ? { ...i, ...formData, amount: parseFloat(formData.amount), tax: parseFloat(formData.tax) }
          : i
      );
      setInvoices(updatedInvoices);
    } else {
      const newInvoice = {
        id: Date.now(),
        invoiceNumber: `INV-${String(Date.now()).slice(-3)}`,
        amount: parseFloat(formData.amount),
        tax: parseFloat(formData.tax),
        ...formData
      };
      setInvoices([...invoices, newInvoice]);
    }
    setShowModal(false);
    handleStatusFilter(statusFilter);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'Draft': 'status-draft',
      'Pending': 'status-pending',
      'Paid': 'status-paid',
      'Overdue': 'status-overdue'
    };
    return `status-badge ${statusClasses[status] || ''}`;
  };

  return (
    <div className="invoice-page">
      <div className="invoice-header">
        <h2>Invoices</h2>
        <button className="add-invoice-btn" onClick={handleAddInvoice}>
          <FaPlus /> Add Invoice
        </button>
      </div>

      <div className="invoice-filter">
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

      <div className="invoice-card">
        <div className="invoice-card-header">
          <h3>Invoice List ({filteredInvoices.length})</h3>
          <div className="invoice-export-buttons">
            <button className="invoice-pdf-btn" onClick={handleExportPDF}>
              <FaFilePdf /> PDF
            </button>
            <button className="invoice-excel-btn" onClick={handleExportExcel}>
              <FaFileExcel /> Excel
            </button>
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer Name</th>
              <th>Amount</th>
              <th>Tax</th>
              <th>Due Date</th>
              <th>Status</th>
              <th className="invoice-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="invoice-number">{invoice.invoiceNumber}</td>
                <td>{invoice.customerName}</td>
                <td>₹{invoice.amount.toFixed(2)}</td>
                <td>₹{invoice.tax.toFixed(2)}</td>
                <td>{invoice.dueDate}</td>
                <td>
                  <span className={getStatusBadge(invoice.status)}>
                    {invoice.status}
                  </span>
                </td>
                <td className="invoice-action-col">
                  <div className="invoice-action-buttons">
                    <FaEdit 
                      className="invoice-edit-icon" 
                      onClick={() => handleEdit(invoice.id)}
                      title="Edit Invoice"
                    />
                    <FaTrash 
                      className="invoice-delete-icon" 
                      onClick={() => handleDelete(invoice.id)}
                      title="Delete Invoice"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingInvoice ? 'Edit Invoice' : 'Add New Invoice'}</h3>
              <FaTimes className="close-btn" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit} className="invoice-form">
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
                <label htmlFor="amount">Amount *</label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="tax">Tax *</label>
                <input
                  id="tax"
                  type="number"
                  step="0.01"
                  name="tax"
                  value={formData.tax}
                  onChange={handleInputChange}
                  placeholder="Enter tax amount"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="dueDate">Due Date *</label>
                <input
                  id="dueDate"
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
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
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">
                  {editingInvoice ? 'Update Invoice' : 'Add Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
