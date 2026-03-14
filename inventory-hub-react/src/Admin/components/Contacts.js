import React, { useState } from 'react';
import '../css/Contacts.css';
import { FaPlus, FaFilePdf, FaFileExcel, FaTrash, FaEdit, FaTimes } from 'react-icons/fa';

const initialContacts = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@company.com",
    phone: "555-8901",
    company: "Tech Corp",
    position: "Manager",
    avatar: "AJ",
    color: "blue",
  },
  {
    id: 2,
    name: "Bob Wilson",
    email: "bob@startup.com",
    phone: "555-8902",
    company: "StartupXYZ",
    position: "CEO",
    avatar: "BW",
    color: "green",
  },
  {
    id: 3,
    name: "Carol Davis",
    email: "carol@design.com",
    phone: "555-8903",
    company: "Design Studio",
    position: "Designer",
    avatar: "CD",
    color: "purple",
  },
  {
    id: 4,
    name: "David Brown",
    email: "david@marketing.com",
    phone: "555-8904",
    company: "Marketing Pro",
    position: "Director",
    avatar: "DB",
    color: "red",
  },
  {
    id: 5,
    name: "Eva Martinez",
    email: "eva@consulting.com",
    phone: "555-8905",
    company: "Consulting Inc",
    position: "Consultant",
    avatar: "EM",
    color: "orange",
  }
];

export default function Contacts() {
  const [contacts, setContacts] = useState(initialContacts);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: ''
  });

  const colors = ['blue', 'green', 'purple', 'red', 'orange', 'teal', 'pink'];

  const handleEdit = (id) => {
    const contact = contacts.find(c => c.id === id);
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      position: contact.position
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      setContacts(contacts.filter(contact => contact.id !== id));
    }
  };

  const handleExportPDF = () => {
    const csvContent = contacts.map(c => 
      `${c.name},${c.email},${c.phone},${c.company},${c.position}`
    ).join('\n');
    const blob = new Blob([`Name,Email,Phone,Company,Position\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
  };

  const handleExportExcel = () => {
    const csvContent = contacts.map(c => 
      `${c.name},${c.email},${c.phone},${c.company},${c.position}`
    ).join('\n');
    const blob = new Blob([`Name,Email,Phone,Company,Position\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.xlsx';
    a.click();
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setFormData({ name: '', email: '', phone: '', company: '', position: '' });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingContact) {
      setContacts(contacts.map(c => 
        c.id === editingContact.id 
          ? { ...c, ...formData }
          : c
      ));
    } else {
      const newContact = {
        id: Date.now(),
        ...formData,
        avatar: formData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        color: colors[Math.floor(Math.random() * colors.length)]
      };
      setContacts([...contacts, newContact]);
    }
    setShowModal(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="contacts-page">
      {/* Header */}
      <div className="contacts-header">
        <h2>Contacts</h2>
        <button className="add-contact-btn" onClick={handleAddContact}>
          <FaPlus /> Add Contact
        </button>
      </div>

      {/* Card */}
      <div className="contacts-card">
        <div className="contacts-card-header">
          <h3>Data List</h3>
          <div className="contacts-export-buttons">
            <button className="contacts-pdf-btn" onClick={handleExportPDF}>
              <FaFilePdf /> PDF
            </button>
            <button className="contacts-excel-btn" onClick={handleExportExcel}>
              <FaFileExcel /> Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="contacts-table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th>Position</th>
              <th className="contact-action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td>
                  <div className={`contact-avatar ${contact.color}`}>
                    {contact.avatar}
                  </div>
                </td>
                <td>{contact.name}</td>
                <td>{contact.email}</td>
                <td>{contact.phone}</td>
                <td>{contact.company}</td>
                <td>{contact.position}</td>
                <td className="contact-action-col">
                  <div className="contact-action-buttons">
                    <FaEdit 
                      className="contact-edit-icon" 
                      onClick={() => handleEdit(contact.id)}
                      title="Edit Contact"
                    />
                    <FaTrash 
                      className="contact-delete-icon" 
                      onClick={() => handleDelete(contact.id)}
                      title="Delete Contact"
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
              <h3>{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
              <FaTimes className="close-btn" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="company">Company *</label>
                <input
                  id="company"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="position">Position *</label>
                <input
                  id="position"
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Enter job position"
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit">
                  {editingContact ? 'Update Contact' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}