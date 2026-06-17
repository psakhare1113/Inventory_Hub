import React, { useState, useEffect } from 'react';

// Reads fresh from localStorage every call — never stale, never a fallback to wrong user
const getLoggedInCustomerId = () => {
  const id = parseInt(localStorage.getItem('customerId')) || parseInt(localStorage.getItem('userId'));
  return id && !isNaN(id) ? id : null;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export const AddressManager = ({
  onAddressSelected,
  showNewAddressForm: externalShowForm = false,
  onFormToggle,
  autoOpenFormIfEmpty = true,
  prefillData = null   // { city, state, zipCode } from "Use My Location"
}) => {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [editForm, setEditForm] = useState({
    addressLine1: '', addressLine2: '', city: '',
    state: '', zipCode: '', country: 'India', contactPhone: ''
  });

  const [newForm, setNewForm] = useState({
    firstName: localStorage.getItem('firstName') || '',
    lastName: localStorage.getItem('lastName') || '',
    email: localStorage.getItem('email') || localStorage.getItem('username') || '',
    phone: localStorage.getItem('phone') || localStorage.getItem('mobileNumber') || localStorage.getItem('phoneNumber') || '',
    gender: '',
    title: '',
    addressLine1: '', addressLine2: '', city: '',
    state: '', zipCode: '', country: 'India'
  });

  const showMsg = (msg, duration = 2500) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), duration);
  };

  // When prefillData arrives (from "Use My Location"), auto-fill newForm + open form
  useEffect(() => {
    if (prefillData && (prefillData.city || prefillData.zipCode)) {
      setNewForm(prev => ({
        ...prev,
        city:    prefillData.city    || prev.city,
        state:   prefillData.state   || prev.state,
        zipCode: prefillData.zipCode || prev.zipCode,
        country: 'India',
      }));
      setShowAddForm(true); // automatically open form
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(prefillData)]);

  // ── Fetch — customerId read fresh inside the call ────────────────────────
  const fetchAddresses = async (isInitialLoad = false) => {
    const customerId = getLoggedInCustomerId();
    if (!customerId) {
      if (autoOpenFormIfEmpty) setShowAddForm(true);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:9999/api/shipping/addresses/${customerId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        if (isInitialLoad) {
          if (data.length > 0) {
            const def = data.find(a => a.isDefault) || data[0];
            setSelectedAddressId(def.id);
          } else if (autoOpenFormIfEmpty) {
            setShowAddForm(true);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      showMsg('❌ Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAddresses(true); }, []);

  useEffect(() => { setShowAddForm(externalShowForm); }, [externalShowForm]);

  // ── Auto-fill phone from localStorage when form opens ───────────────────
  useEffect(() => {
    if (showAddForm) {
      const storedPhone = localStorage.getItem('phone') || localStorage.getItem('mobileNumber') || localStorage.getItem('phoneNumber') || '';
      if (storedPhone) {
        setNewForm(prev => ({ ...prev, phone: prev.phone || storedPhone }));
      }
    }
  }, [showAddForm]);

  const handleSelect = (address) => setSelectedAddressId(address.id);

  // ── Set Default ──────────────────────────────────────────────────────────
  const handleSetDefault = async (addressId) => {
    const customerId = getLoggedInCustomerId();
    if (!customerId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:9999/api/shipping/addresses/${customerId}/default/${addressId}`,
        { method: 'PUT', headers: getAuthHeaders() }
      );
      if (res.ok) { await fetchAddresses(); showMsg('✅ Default address updated'); }
    } catch { showMsg('❌ Failed to set default'); }
    finally { setLoading(false); }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const handleEdit = (address) => {
    setEditingAddressId(address.id);
    setEditForm({
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      country: address.country || 'India',
      contactPhone: address.contactPhone || ''
    });
  };

  const handleSaveEdit = async () => {
    const customerId = getLoggedInCustomerId();
    if (!customerId) return;
    try {
      setSaveLoading(true);

      // 1. Save to shippingdb
      const shippingRes = await fetch(
        `http://localhost:9999/api/shipping/addresses/${editingAddressId}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ ...editForm, customerId, id: editingAddressId })
        }
      );

      if (!shippingRes.ok) {
        showMsg('❌ Failed to update address');
        return;
      }

      // 2. Sync to ordersdb customer_details (best-effort — includes phone)
      try {
        await fetch(`http://localhost:9999/api/orders/updateAddresses/${customerId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            addressLine1: editForm.addressLine1,
            addressLine2: editForm.addressLine2 || '',
            city: editForm.city,
            state: editForm.state,
            pincode: editForm.zipCode,
            country: editForm.country,
            phone: editForm.contactPhone || ''
          })
        });
      } catch (syncErr) {
        console.warn('⚠️ customer_details sync failed (non-critical):', syncErr);
      }

      await fetchAddresses();
      setEditingAddressId(null);
      showMsg('✅ Address updated');
    } catch (err) {
      console.error('Error updating address:', err);
      showMsg('❌ Error updating address');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (addressId) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      setLoading(true);
      const res = await fetch(
        `http://localhost:9999/api/shipping/addresses/${addressId}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      );
      if (res.ok) {
        if (selectedAddressId === addressId) {
          setSelectedAddressId(null);
          onAddressSelected && onAddressSelected(null);
        }
        await fetchAddresses();
        showMsg('✅ Address deleted');
      }
    } catch { showMsg('❌ Failed to delete address'); }
    finally { setLoading(false); }
  };

  // ── Add New ──────────────────────────────────────────────────────────────
  const isNewFormValid = () =>
    newForm.firstName && newForm.lastName && newForm.email &&
    newForm.phone && newForm.addressLine1 && newForm.city &&
    newForm.state && newForm.zipCode;

  const handleAddNew = async (e) => {
    e.preventDefault();
    if (!isNewFormValid()) return;
    const customerId = getLoggedInCustomerId();
    if (!customerId) { showMsg('❌ Please log in to save an address'); return; }
    setSaveLoading(true);
    showMsg('📝 Saving address...');
    try {
      // 1. Save to shippingdb
      const shippingRes = await fetch('http://localhost:9999/api/shipping/addresses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          customerId,
          addressLine1: newForm.addressLine1,
          addressLine2: newForm.addressLine2 || '',
          city: newForm.city,
          state: newForm.state,
          zipCode: newForm.zipCode,
          country: newForm.country,
          contactPhone: newForm.phone,
          isDefault: addresses.length === 0
        })
      });
      if (!shippingRes.ok) { showMsg('❌ Failed to save address'); return; }
      const savedAddress = await shippingRes.json();

      // 2. Save to ordersdb customer_details — await so we know if it failed
      try {
        const ordersRes = await fetch('http://localhost:9999/api/orders/addCustomerDetails', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            customerId,
            firstName: newForm.firstName,
            lastName: newForm.lastName,
            email: newForm.email,
            phone: newForm.phone,
            gender: newForm.gender || 'Not Specified',
            title: newForm.title || 'Mr/Ms',
            status: 'ACTIVE',
            addressLine1: newForm.addressLine1,
            addressLine2: newForm.addressLine2 || '',
            city: newForm.city,
            state: newForm.state,
            pincode: newForm.zipCode,
            country: newForm.country,
            isDefault: addresses.length === 0
          })
        });
        if (!ordersRes.ok) {
          const errText = await ordersRes.text().catch(() => '');
          console.warn('⚠️ customer_details save failed:', ordersRes.status, errText);
        } else {
          console.log('✅ customer_details saved successfully');
        }
      } catch (syncErr) {
        console.warn('⚠️ customer_details save error (non-critical):', syncErr);
      }

      showMsg('✅ Address saved!');
      setShowAddForm(false);
      onFormToggle && onFormToggle(false);
      setNewForm(prev => ({
        ...prev,
        addressLine1: '', addressLine2: '', city: '',
        state: '', zipCode: '', country: 'India'
      }));
      await fetchAddresses();
      setSelectedAddressId(savedAddress.id);
    } catch (err) {
      console.error('Error adding address:', err);
      showMsg('❌ Error adding address');
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleAddForm = () => {
    const next = !showAddForm;
    setShowAddForm(next);
    onFormToggle && onFormToggle(next);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading && addresses.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto" />
        <p className="mt-2 text-gray-600 text-sm">Loading addresses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200'
          : message.includes('❌') ? 'bg-red-50 text-red-800 border border-red-200'
          : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      {/* Saved addresses list */}
      {addresses.length > 0 && !showAddForm && (
        <div>
          <h3 className="text-base font-semibold mb-3 text-gray-700">Saved Addresses</h3>
          <div className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`border-2 rounded-xl p-4 transition-all ${
                  selectedAddressId === address.id
                    ? 'border-yellow-500 bg-yellow-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {editingAddressId === address.id ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Edit Address</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="text" value={editForm.addressLine1}
                        onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="Address Line 1 *" />
                      <input type="text" value={editForm.addressLine2}
                        onChange={(e) => setEditForm({ ...editForm, addressLine2: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="Address Line 2" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="City *" />
                      <input type="text" value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="State *" />
                      <input type="text" value={editForm.zipCode}
                        onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="PIN Code *" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="tel" value={editForm.contactPhone}
                        onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="Phone *" />
                      <select value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500">
                        <option value="India">India</option>
                        <option value="USA">USA</option>
                        <option value="Canada">Canada</option>
                        <option value="UK">UK</option>
                        <option value="Australia">Australia</option>
                      </select>
                    </div>
                    <div className="flex space-x-2 pt-1">
                      <button onClick={handleSaveEdit} disabled={saveLoading}
                        className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 disabled:opacity-50 font-medium">
                        {saveLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button onClick={() => setEditingAddressId(null)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 font-medium">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                      <input type="radio" name="selectedAddress"
                        checked={selectedAddressId === address.id}
                        onChange={() => handleSelect(address)}
                        className="mt-1 accent-yellow-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span className="font-semibold text-gray-800 text-sm">{address.addressLine1}</span>
                          {address.isDefault && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">Default</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 space-y-0.5">
                          {address.addressLine2 && <div>{address.addressLine2}</div>}
                          <div>{address.city}, {address.state} — {address.zipCode}</div>
                          <div>{address.country}</div>
                          {address.contactPhone && (
                            <div className="flex items-center gap-1"><span>📞</span><span>{address.contactPhone}</span></div>
                          )}
                        </div>
                      </div>
                    </label>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => handleEdit(address)}
                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium border border-blue-200">
                        ✏️ Edit
                      </button>
                      {!address.isDefault && (
                        <button onClick={() => handleSetDefault(address.id)} disabled={loading}
                          className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium border border-gray-200 disabled:opacity-50">
                          Set Default
                        </button>
                      )}
                      {addresses.length > 1 && (
                        <button onClick={() => handleDelete(address.id)} disabled={loading}
                          className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium border border-red-200 disabled:opacity-50">
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliver button */}
      {selectedAddressId && !editingAddressId && !showAddForm && (
        <button
          onClick={() => {
            const addr = addresses.find(a => a.id === selectedAddressId);
            onAddressSelected && onAddressSelected(addr);
          }}
          className="w-full py-3 bg-yellow-600 text-white rounded-xl font-semibold hover:bg-yellow-700 transition-colors shadow-sm"
        >
          Deliver to this Address →
        </button>
      )}

      {/* Add New Address toggle (only when addresses exist) */}
      {addresses.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <button onClick={toggleAddForm}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-yellow-500 hover:text-yellow-600 transition-colors text-sm font-medium">
            {showAddForm ? '✕ Cancel' : '+ Add New Address'}
          </button>
        </div>
      )}

      {/* Add New Address Form */}
      {showAddForm && (
        <div className="border-2 border-yellow-200 rounded-xl p-5 bg-yellow-50 space-y-4">
          <h3 className="text-base font-semibold text-gray-800">
            {addresses.length === 0 ? '📍 Add Your Delivery Address' : 'New Delivery Address'}
          </h3>
          <form onSubmit={handleAddNew} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <select value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">Title</option>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Ms">Ms</option>
                <option value="Dr">Dr</option>
              </select>
              <select value={newForm.gender} onChange={(e) => setNewForm({ ...newForm, gender: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" required value={newForm.firstName}
                onChange={(e) => setNewForm({ ...newForm, firstName: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="First Name *" />
              <input type="text" required value={newForm.lastName}
                onChange={(e) => setNewForm({ ...newForm, lastName: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Last Name *" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="email" required value={newForm.email}
                onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="Email *" />
              <input type="tel" required value={newForm.phone}
                onChange={(e) => setNewForm({ ...newForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                maxLength={10}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="10-digit mobile *" />
            </div>
            <input type="text" required value={newForm.addressLine1}
              onChange={(e) => setNewForm({ ...newForm, addressLine1: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Address Line 1 *" />
            <input type="text" value={newForm.addressLine2}
              onChange={(e) => setNewForm({ ...newForm, addressLine2: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Address Line 2 (optional)" />
            <div className="grid grid-cols-3 gap-3">
              <input type="text" required value={newForm.city}
                onChange={(e) => setNewForm({ ...newForm, city: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="City *" />
              <input type="text" required value={newForm.state}
                onChange={(e) => setNewForm({ ...newForm, state: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="State *" />
              <input type="text" required value={newForm.zipCode}
                onChange={(e) => setNewForm({ ...newForm, zipCode: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                placeholder="PIN Code *" />
            </div>
            <select value={newForm.country} onChange={(e) => setNewForm({ ...newForm, country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500">
              <option value="India">India</option>
              <option value="USA">USA</option>
              <option value="Canada">Canada</option>
              <option value="UK">UK</option>
              <option value="Australia">Australia</option>
            </select>
            <button type="submit" disabled={saveLoading || !isNewFormValid()}
              className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
                saveLoading || !isNewFormValid() ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700 shadow-sm'
              }`}>
              {saveLoading ? 'Saving...' : 'Save Address'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
