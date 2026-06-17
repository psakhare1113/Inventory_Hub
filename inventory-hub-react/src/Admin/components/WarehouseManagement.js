import React, { useState, useEffect, useCallback } from 'react';
import {
  Warehouse, Plus, Edit2, Trash2, X, MapPin, Phone, Mail,
  Package, User, Hash, Building2, ChevronDown, ChevronUp,
  RefreshCw, CheckCircle, XCircle, Eye, Layers
} from 'lucide-react';
import { warehouseService } from '../../services/imsApi';

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ active }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
    background: active ? '#dcfce7' : '#fee2e2',
    color: active ? '#166534' : '#991b1b'
  }}>
    {active ? <CheckCircle size={12} /> : <XCircle size={12} />}
    {active ? 'Active' : 'Inactive'}
  </span>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: 'white', borderRadius: '12px', padding: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex',
    alignItems: 'center', gap: '16px', flex: '1', minWidth: '160px'
  }}>
    <div style={{
      width: '48px', height: '48px', borderRadius: '12px',
      background: color + '20', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0
    }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>{label}</div>
    </div>
  </div>
);

// ─── Location Row ─────────────────────────────────────────────────────────────
const LocationRow = ({ loc }) => (
  <tr style={{ fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>
    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#4338ca', fontWeight: '600' }}>
      {loc.locationCode}
    </td>
    <td style={{ padding: '8px 12px', color: '#475569' }}>{loc.locationType}</td>
    <td style={{ padding: '8px 12px', color: '#475569' }}>
      {[loc.area, loc.aisle, loc.bay, loc.level, loc.binCode].filter(Boolean).join(' › ')}
    </td>
    <td style={{ padding: '8px 12px', color: '#475569' }}>
      {loc.currentCapacity} / {loc.maxCapacity} {loc.capacityUom}
    </td>
    <td style={{ padding: '8px 12px' }}>
      <StatusBadge active={loc.isAvailable} />
    </td>
  </tr>
);

// ─── Warehouse Card ───────────────────────────────────────────────────────────
const WarehouseCard = ({ wh, onEdit, onDeactivate, onDelete, onViewLocations, locationsOpen, locations, locLoading }) => (
  <div style={{
    background: 'white', borderRadius: '14px', padding: '24px',
    boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
    transition: 'box-shadow 0.2s'
  }}>
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '10px',
          background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Warehouse size={22} color="#7c3aed" />
        </div>
        <div>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>{wh.name}</div>
          <div style={{
            fontFamily: 'monospace', fontSize: '12px', color: '#7c3aed',
            background: '#ede9fe', padding: '2px 8px', borderRadius: '6px',
            display: 'inline-block', marginTop: '2px'
          }}>{wh.code}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <StatusBadge active={wh.isActive} />
        <button onClick={() => onEdit(wh)} title="Edit" style={{
          background: '#eff6ff', border: 'none', borderRadius: '8px',
          padding: '7px', cursor: 'pointer', color: '#2563eb'
        }}><Edit2 size={15} /></button>
        {wh.isActive && (
          <button onClick={() => onDeactivate(wh.id)} title="Deactivate" style={{
            background: '#fef9c3', border: 'none', borderRadius: '8px',
            padding: '7px', cursor: 'pointer', color: '#92400e'
          }} title="Deactivate (soft)"><XCircle size={15} /></button>
        )}
        <button onClick={() => onDelete(wh)} title="Permanently Delete" style={{
          background: '#fef2f2', border: 'none', borderRadius: '8px',
          padding: '7px', cursor: 'pointer', color: '#dc2626'
        }}><Trash2 size={15} /></button>
      </div>
    </div>

    {/* Info Grid */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#475569' }}>
        <MapPin size={14} style={{ marginTop: '2px', flexShrink: 0, color: '#94a3b8' }} />
        <span>{[wh.address, wh.city, wh.state, wh.pincode].filter(Boolean).join(', ')}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
        <User size={14} style={{ flexShrink: 0, color: '#94a3b8' }} />
        <span>{wh.contactPerson || '—'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
        <Phone size={14} style={{ flexShrink: 0, color: '#94a3b8' }} />
        <span>{wh.contactPhone || '—'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
        <Mail size={14} style={{ flexShrink: 0, color: '#94a3b8' }} />
        <span>{wh.contactEmail || '—'}</span>
      </div>
      {wh.capacitySqft && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569' }}>
          <Package size={14} style={{ flexShrink: 0, color: '#94a3b8' }} />
          <span>Capacity: {Number(wh.capacitySqft).toLocaleString('en-IN')} sq.ft</span>
        </div>
      )}
    </div>

    {/* Locations Toggle */}
    <button onClick={() => onViewLocations(wh.id)} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      background: locationsOpen ? '#ede9fe' : '#f8fafc',
      border: '1px solid ' + (locationsOpen ? '#c4b5fd' : '#e2e8f0'),
      borderRadius: '8px', padding: '7px 14px', cursor: 'pointer',
      fontSize: '13px', fontWeight: '600',
      color: locationsOpen ? '#7c3aed' : '#475569', width: '100%',
      justifyContent: 'center'
    }}>
      <Layers size={14} />
      {locationsOpen ? 'Hide' : 'View'} Rack & Shelf Locations
      {locationsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>

    {/* Locations Table */}
    {locationsOpen && (
      <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {locLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Loading locations...
          </div>
        ) : locations.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No rack/shelf locations configured yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Location Code</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Path</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Capacity</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Available</th>
              </tr>
            </thead>
            <tbody>
              {locations.map(loc => <LocationRow key={loc.id} loc={loc} />)}
            </tbody>
          </table>
        )}
      </div>
    )}
  </div>
);

// ─── India States → Cities map ───────────────────────────────────────────────
const STATE_CITIES = {
  'Andhra Pradesh':       ['Visakhapatnam','Vijayawada','Guntur','Nellore','Kurnool','Tirupati','Rajahmundry','Kakinada'],
  'Arunachal Pradesh':    ['Itanagar','Naharlagun','Pasighat'],
  'Assam':                ['Guwahati','Silchar','Dibrugarh','Jorhat','Nagaon'],
  'Bihar':                ['Patna','Gaya','Bhagalpur','Muzaffarpur','Purnia'],
  'Chhattisgarh':         ['Raipur','Bhilai','Bilaspur','Korba','Durg'],
  'Goa':                  ['Panaji','Margao','Vasco da Gama','Mapusa'],
  'Gujarat':              ['Ahmedabad','Surat','Vadodara','Rajkot','Bhavnagar','Jamnagar','Gandhinagar','Anand'],
  'Haryana':              ['Faridabad','Gurgaon','Panipat','Ambala','Hisar','Rohtak','Karnal'],
  'Himachal Pradesh':     ['Shimla','Manali','Dharamshala','Solan','Mandi'],
  'Jharkhand':            ['Ranchi','Jamshedpur','Dhanbad','Bokaro','Deoghar'],
  'Karnataka':            ['Bengaluru','Mysuru','Hubli','Mangaluru','Belagavi','Kalaburagi','Davangere','Ballari'],
  'Kerala':               ['Thiruvananthapuram','Kochi','Kozhikode','Thrissur','Kollam','Palakkad','Alappuzha'],
  'Madhya Pradesh':       ['Bhopal','Indore','Jabalpur','Gwalior','Ujjain','Sagar','Rewa'],
  'Maharashtra':          ['Mumbai','Pune','Nagpur','Nashik','Aurangabad','Solapur','Kolhapur','Thane','Navi Mumbai','Pimpri-Chinchwad','Amravati'],
  'Manipur':              ['Imphal','Thoubal','Bishnupur'],
  'Meghalaya':            ['Shillong','Tura','Jowai'],
  'Mizoram':              ['Aizawl','Lunglei','Champhai'],
  'Nagaland':             ['Kohima','Dimapur','Mokokchung'],
  'Odisha':               ['Bhubaneswar','Cuttack','Rourkela','Berhampur','Sambalpur'],
  'Punjab':               ['Ludhiana','Amritsar','Jalandhar','Patiala','Bathinda','Mohali'],
  'Rajasthan':            ['Jaipur','Jodhpur','Udaipur','Kota','Ajmer','Bikaner','Alwar'],
  'Sikkim':               ['Gangtok','Namchi','Gyalshing'],
  'Tamil Nadu':           ['Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli','Erode','Vellore'],
  'Telangana':            ['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Secunderabad'],
  'Tripura':              ['Agartala','Udaipur','Dharmanagar'],
  'Uttar Pradesh':        ['Lucknow','Kanpur','Agra','Varanasi','Meerut','Allahabad','Ghaziabad','Noida','Bareilly','Aligarh'],
  'Uttarakhand':          ['Dehradun','Haridwar','Roorkee','Haldwani','Rishikesh'],
  'West Bengal':          ['Kolkata','Howrah','Durgapur','Asansol','Siliguri','Bardhaman'],
  'Delhi':                ['New Delhi','Dwarka','Rohini','Janakpuri','Laxmi Nagar','Saket','Pitampura'],
  'Chandigarh':           ['Chandigarh'],
  'Jammu & Kashmir':      ['Srinagar','Jammu','Anantnag','Baramulla'],
  'Ladakh':               ['Leh','Kargil'],
  'Puducherry':           ['Puducherry','Karaikal','Mahe'],
};

const INDIA_STATES = Object.keys(STATE_CITIES).sort();

// ─── Capacity presets ─────────────────────────────────────────────────────────
const CAPACITY_PRESETS = [
  { label: 'Small  — 5,000 sq.ft',   value: '5000'  },
  { label: 'Medium — 10,000 sq.ft',  value: '10000' },
  { label: 'Large  — 25,000 sq.ft',  value: '25000' },
  { label: 'XLarge — 50,000 sq.ft',  value: '50000' },
  { label: 'XXL    — 1,00,000 sq.ft',value: '100000'},
  { label: 'Custom…',                 value: 'custom'},
];

// shared select style
const selectStyle = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1px solid #d1d5db', fontSize: '14px',
  boxSizing: 'border-box', background: 'white',
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  paddingRight: '32px', cursor: 'pointer'
};

// ─── Empty Form State (matches DB fields exactly) ────────────────────────────
const emptyForm = {
  code: '',          // WH-PUN-001  (auto-generated or manual)
  name: '',          // Warehouse Name
  address: '',       // Full address
  city: '',          // City
  state: '',         // State
  pincode: '',       // Pincode
  contactPerson: '', // Manager Assigned
  contactPhone: '',  // Contact Number
  contactEmail: '',  // Contact Email
  capacitySqft: '',  // Capacity (sq.ft)
  capacityMode: '',  // 'preset' value or 'custom'
  isActive: true
};

// ─── City → 3-letter code map ─────────────────────────────────────────────────
const CITY_CODE = {
  // Maharashtra
  'Mumbai': 'MUM', 'Pune': 'PUN', 'Nagpur': 'NGP', 'Nashik': 'NSK',
  'Aurangabad': 'AUR', 'Solapur': 'SLP', 'Kolhapur': 'KOL', 'Thane': 'THN',
  'Navi Mumbai': 'NMB', 'Pimpri-Chinchwad': 'PIM', 'Amravati': 'AMR',
  // Karnataka
  'Bengaluru': 'BLR', 'Mysuru': 'MYS', 'Hubli': 'HBL', 'Mangaluru': 'MNG',
  'Belagavi': 'BLG', 'Kalaburagi': 'KLB', 'Davangere': 'DVG', 'Ballari': 'BLR2',
  // Tamil Nadu
  'Chennai': 'CHN', 'Coimbatore': 'CBE', 'Madurai': 'MDU', 'Tiruchirappalli': 'TRY',
  'Salem': 'SLM', 'Tirunelveli': 'TNV', 'Erode': 'ERD', 'Vellore': 'VLR',
  // Telangana
  'Hyderabad': 'HYD', 'Warangal': 'WGL', 'Nizamabad': 'NZB', 'Karimnagar': 'KMR',
  'Khammam': 'KHM', 'Secunderabad': 'SCB',
  // Gujarat
  'Ahmedabad': 'AMD', 'Surat': 'SRT', 'Vadodara': 'VDR', 'Rajkot': 'RJK',
  'Bhavnagar': 'BVN', 'Jamnagar': 'JMN', 'Gandhinagar': 'GDN', 'Anand': 'AND',
  // Rajasthan
  'Jaipur': 'JAI', 'Jodhpur': 'JDH', 'Udaipur': 'UDR', 'Kota': 'KOT',
  'Ajmer': 'AJM', 'Bikaner': 'BKN', 'Alwar': 'ALW',
  // Uttar Pradesh
  'Lucknow': 'LKO', 'Kanpur': 'KNP', 'Agra': 'AGR', 'Varanasi': 'VNS',
  'Meerut': 'MRT', 'Allahabad': 'ALD', 'Ghaziabad': 'GZB', 'Noida': 'NOI',
  'Bareilly': 'BRL', 'Aligarh': 'ALG',
  // Delhi
  'New Delhi': 'NDL', 'Dwarka': 'DWK', 'Rohini': 'RHN', 'Janakpuri': 'JNK',
  'Laxmi Nagar': 'LXN', 'Saket': 'SKT', 'Pitampura': 'PTP',
  // West Bengal
  'Kolkata': 'CCU', 'Howrah': 'HWH', 'Durgapur': 'DGP', 'Asansol': 'ASN',
  'Siliguri': 'SLG', 'Bardhaman': 'BDM',
  // Madhya Pradesh
  'Bhopal': 'BPL', 'Indore': 'IDR', 'Jabalpur': 'JBP', 'Gwalior': 'GWL',
  'Ujjain': 'UJN', 'Sagar': 'SGR', 'Rewa': 'REW',
  // Punjab
  'Ludhiana': 'LDH', 'Amritsar': 'ATQ', 'Jalandhar': 'JUC', 'Patiala': 'PTL',
  'Bathinda': 'BTI', 'Mohali': 'MOH',
  // Haryana
  'Faridabad': 'FBD', 'Gurgaon': 'GGN', 'Panipat': 'PNP', 'Ambala': 'UMB',
  'Hisar': 'HSR', 'Rohtak': 'ROH', 'Karnal': 'KNL',
  // Bihar
  'Patna': 'PAT', 'Gaya': 'GAY', 'Bhagalpur': 'BGP', 'Muzaffarpur': 'MZF',
  // Odisha
  'Bhubaneswar': 'BBI', 'Cuttack': 'CTC', 'Rourkela': 'RKL', 'Berhampur': 'BHR',
  // Andhra Pradesh
  'Visakhapatnam': 'VTZ', 'Vijayawada': 'VGA', 'Guntur': 'GNT', 'Nellore': 'NLR',
  'Tirupati': 'TIR', 'Rajahmundry': 'RJY',
  // Kerala
  'Thiruvananthapuram': 'TRV', 'Kochi': 'COK', 'Kozhikode': 'CCJ', 'Thrissur': 'TCR',
  'Kollam': 'KLM', 'Palakkad': 'PGT', 'Alappuzha': 'ALY',
  // Jharkhand
  'Ranchi': 'IXR', 'Jamshedpur': 'IXW', 'Dhanbad': 'DHN',
  // Chhattisgarh
  'Raipur': 'RPR', 'Bhilai': 'BHL', 'Bilaspur': 'PAB',
  // Assam
  'Guwahati': 'GAU', 'Silchar': 'IXS', 'Dibrugarh': 'DIB',
  // Uttarakhand
  'Dehradun': 'DED', 'Haridwar': 'HDW', 'Roorkee': 'RKE', 'Haldwani': 'HLD',
  // Himachal Pradesh
  'Shimla': 'SLV', 'Manali': 'KUU', 'Dharamshala': 'DHM',
  // Goa
  'Panaji': 'GOI', 'Margao': 'MAO', 'Vasco da Gama': 'VSG',
  // Chandigarh
  'Chandigarh': 'IXC',
  // Jammu & Kashmir
  'Srinagar': 'SXR', 'Jammu': 'IXJ',
  // Puducherry
  'Puducherry': 'PNY',
};

// ─── Auto-generate warehouse code from city ───────────────────────────────────
const generateCode = (city, existingCodes) => {
  if (!city) return '';
  // Use known 3-letter code, fallback to first 3 chars of city
  const abbr = CITY_CODE[city]
    || city.trim().toUpperCase().replace(/\s+/g, '').slice(0, 3);
  const prefix = 'WH-' + abbr + '-';
  let num = 1;
  while (existingCodes.includes(prefix + String(num).padStart(3, '0'))) num++;
  return prefix + String(num).padStart(3, '0');
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WarehouseManagement() {
  const [warehouses, setWarehouses]       = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [showModal, setShowModal]         = useState(false);
  const [editingWh, setEditingWh]         = useState(null);
  const [formData, setFormData]           = useState(emptyForm);
  const [saving, setSaving]               = useState(false);
  const [toast, setToast]                 = useState(null);
  const [openLocations, setOpenLocations] = useState({});   // warehouseId -> bool
  const [locationData, setLocationData]   = useState({});   // warehouseId -> []
  const [locLoading, setLocLoading]       = useState({});   // warehouseId -> bool
  const [filterActive, setFilterActive]   = useState('all');
  const [search, setSearch]               = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load warehouses ──────────────────────────────────────────────────────────
  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehouseService.getAllWarehouses();
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load warehouses: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWarehouses(); }, [loadWarehouses]);

  // ── Toggle locations panel ───────────────────────────────────────────────────
  const handleViewLocations = async (warehouseId) => {
    const isOpen = openLocations[warehouseId];
    setOpenLocations(prev => ({ ...prev, [warehouseId]: !isOpen }));
    if (!isOpen && !locationData[warehouseId]) {
      setLocLoading(prev => ({ ...prev, [warehouseId]: true }));
      try {
        const locs = await warehouseService.getWarehouseLocations(warehouseId);
        setLocationData(prev => ({ ...prev, [warehouseId]: Array.isArray(locs) ? locs : [] }));
      } catch {
        setLocationData(prev => ({ ...prev, [warehouseId]: [] }));
      } finally {
        setLocLoading(prev => ({ ...prev, [warehouseId]: false }));
      }
    }
  };

  // ── Open Add modal ───────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingWh(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  // ── Open Edit modal ──────────────────────────────────────────────────────────
  const handleEdit = (wh) => {
    setEditingWh(wh);
    const cap = wh.capacitySqft != null ? String(wh.capacitySqft) : '';
    const preset = CAPACITY_PRESETS.find(p => p.value !== 'custom' && p.value === cap);
    setFormData({
      code:          wh.code          || '',
      name:          wh.name          || '',
      address:       wh.address       || '',
      city:          wh.city          || '',
      state:         wh.state         || '',
      pincode:       wh.pincode       || '',
      contactPerson: wh.contactPerson || '',
      contactPhone:  wh.contactPhone  || '',
      contactEmail:  wh.contactEmail  || '',
      capacitySqft:  cap,
      capacityMode:  preset ? preset.value : (cap ? 'custom' : ''),
      isActive:      wh.isActive      ?? true
    });
    setShowModal(true);
  };

  // ── Deactivate (soft) ────────────────────────────────────────────────────────
  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this warehouse? It will be marked inactive but data will be preserved.')) return;
    try {
      await warehouseService.deactivateWarehouse(id);
      showToast('Warehouse deactivated.');
      loadWarehouses();
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    }
  };

  // ── Permanently Delete ────────────────────────────────────────────────────────
  const handleDelete = async (wh) => {
    const confirmed = window.confirm(
      `⚠️ PERMANENT DELETE\n\n"${wh.name}" (${wh.code}) will be permanently deleted.\nAll rack & shelf locations will also be deleted.\n\nThis action cannot be undone. Continue?`
    );
    if (!confirmed) return;
    // Double confirm for safety
    const reconfirmed = window.confirm(`Final confirm: Permanently delete "${wh.code}"?`);
    if (!reconfirmed) return;
    try {
      await warehouseService.deleteWarehousePermanently(wh.id);
      showToast(`${wh.code} permanently deleted.`);
      setLocationData(prev => { const n = {...prev}; delete n[wh.id]; return n; });
      setOpenLocations(prev => { const n = {...prev}; delete n[wh.id]; return n; });
      loadWarehouses();
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  };

  // ── Form field change ────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newForm = { ...formData, [name]: type === 'checkbox' ? checked : value };

    // Auto-generate code when city changes (only for new warehouse)
    if (name === 'city' && !editingWh) {
      const existingCodes = warehouses.map(w => w.code);
      newForm.code = generateCode(value, existingCodes);
    }
    setFormData(newForm);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { showToast('Warehouse name is required.', 'error'); return; }
    if (!formData.city.trim()) { showToast('City is required.', 'error'); return; }
    if (!formData.code.trim()) { showToast('Warehouse code is required.', 'error'); return; }

    setSaving(true);
    try {
      // strip UI-only field before sending to backend
      const { capacityMode, ...rest } = formData;
      const payload = {
        ...rest,
        capacitySqft: formData.capacitySqft ? parseFloat(formData.capacitySqft) : null
      };

      if (editingWh) {
        await warehouseService.updateWarehouse(editingWh.id, payload);
        showToast('Warehouse updated successfully.');
      } else {
        await warehouseService.createWarehouse(payload);
        showToast('Warehouse created! ID: ' + formData.code);
      }
      setShowModal(false);
      loadWarehouses();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered list — newest first ─────────────────────────────────────────────
  const filtered = [...warehouses]
    .sort((a, b) => (b.id || 0) - (a.id || 0))  // newest (highest id) first
    .filter(wh => {
    const matchStatus = filterActive === 'all'
      ? true : filterActive === 'active' ? wh.isActive : !wh.isActive;
    const q = search.toLowerCase();
    const matchSearch = !q || wh.name?.toLowerCase().includes(q)
      || wh.code?.toLowerCase().includes(q) || wh.city?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const activeCount   = warehouses.filter(w => w.isActive).length;
  const inactiveCount = warehouses.filter(w => !w.isActive).length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '24px', zIndex: 99999,
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: '1px solid ' + (toast.type === 'error' ? '#fecaca' : '#bbf7d0'),
          color: toast.type === 'error' ? '#991b1b' : '#166534',
          borderRadius: '10px', padding: '12px 20px', fontWeight: '600',
          fontSize: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
        }}>
          {toast.type === 'error' ? '❌ ' : '✅ '}{toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Warehouse Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
            Create and manage warehouses, rack & shelf locations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadWarehouses} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px',
            padding: '10px 16px', cursor: 'pointer', fontSize: '14px', color: '#475569',
            fontWeight: '600'
          }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button onClick={handleAdd} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#7c3aed', border: 'none', borderRadius: '10px',
            padding: '10px 18px', cursor: 'pointer', fontSize: '14px',
            color: 'white', fontWeight: '700'
          }}>
            <Plus size={16} /> Add New Warehouse
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <StatCard icon={Warehouse}    label="Total Warehouses" value={warehouses.length} color="#7c3aed" />
        <StatCard icon={CheckCircle}  label="Active"           value={activeCount}       color="#16a34a" />
        <StatCard icon={XCircle}      label="Inactive"         value={inactiveCount}     color="#dc2626" />
        <StatCard icon={Layers}       label="Total Locations"
          value={Object.values(locationData).reduce((s, l) => s + l.length, 0)}
          color="#0284c7" />
      </div>

      {/* Filters — horizontal tab bar */}
      <div style={{
        background: 'white', borderRadius: '12px', padding: '12px 16px',
        marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexWrap: 'wrap'
      }}>
        {/* Tab pills */}
        <div style={{
          display: 'inline-flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px'
        }}>
          {[
            { key: 'all',      label: 'All',      count: warehouses.length },
            { key: 'active',   label: 'Active',   count: activeCount },
            { key: 'inactive', label: 'Inactive', count: inactiveCount }
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilterActive(tab.key)} style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', border: 'none', whiteSpace: 'nowrap',
              background: filterActive === tab.key ? '#7c3aed' : 'transparent',
              color: filterActive === tab.key ? 'white' : '#64748b',
              transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: '5px'
            }}>
              {tab.label}
              <span style={{
                background: filterActive === tab.key ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: filterActive === tab.key ? 'white' : '#64748b',
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700'
              }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Search by name, code, city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '200px', padding: '8px 12px', borderRadius: '8px',
            border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none',
            background: '#fafafa'
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '16px', color: '#991b1b', marginBottom: '20px', fontSize: '14px'
        }}>⚠️ {error}</div>
      )}

      {/* Loading */}
      {loading && warehouses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div style={{
            width: '40px', height: '40px', border: '4px solid #e2e8f0',
            borderTop: '4px solid #7c3aed', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto 12px'
          }} />
          Loading warehouses...
        </div>
      )}

      {/* Warehouse Cards Grid */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <Warehouse size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: '16px', fontWeight: '600' }}>No warehouses found</div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            {search ? 'Try a different search term.' : 'Click "Add New Warehouse" to get started.'}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '20px' }}>
        {filtered.map(wh => (
          <WarehouseCard
            key={wh.id}
            wh={wh}
            onEdit={handleEdit}
            onDeactivate={handleDeactivate}
            onDelete={handleDelete}
            onViewLocations={handleViewLocations}
            locationsOpen={!!openLocations[wh.id]}
            locations={locationData[wh.id] || []}
            locLoading={!!locLoading[wh.id]}
          />
        ))}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99998, padding: '16px'
        }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '100%', maxWidth: '640px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)'
          }} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
              position: 'sticky', top: 0, background: 'white', zIndex: 1,
              borderRadius: '16px 16px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Warehouse size={18} color="#7c3aed" />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '17px', color: '#0f172a' }}>
                    {editingWh ? 'Edit Warehouse' : 'Add New Warehouse'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {editingWh ? `Editing: ${editingWh.code}` : 'Fill details to create a new warehouse'}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                background: '#f1f5f9', border: 'none', borderRadius: '8px',
                padding: '8px', cursor: 'pointer', color: '#64748b'
              }}><X size={18} /></button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>

              {/* Section: Basic Info */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '11px', fontWeight: '700', color: '#7c3aed',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px'
                }}>Basic Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                  {/* Warehouse Name */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Warehouse Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input name="name" value={formData.name} onChange={handleChange} required
                      placeholder="e.g. Pune Central Warehouse"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>

                  {/* Warehouse Code (auto-generated) */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Warehouse ID / Code <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input name="code" value={formData.code} onChange={handleChange} required
                      placeholder="e.g. WH-PUN-001"
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: '8px',
                        border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box',
                        fontFamily: 'monospace', background: editingWh ? '#f9fafb' : 'white'
                      }} />
                    {!editingWh && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                        Auto-generated from city. You can edit manually.
                      </div>
                    )}
                  </div>

                  {/* Capacity — preset dropdown + custom input */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Capacity (sq.ft)
                    </label>
                    <select
                      name="capacityMode"
                      value={formData.capacityMode}
                      onChange={e => {
                        const v = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          capacityMode: v,
                          capacitySqft: v === 'custom' ? '' : v
                        }));
                      }}
                      style={selectStyle}
                    >
                      <option value="">— Select capacity —</option>
                      {CAPACITY_PRESETS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    {formData.capacityMode === 'custom' && (
                      <input
                        name="capacitySqft"
                        value={formData.capacitySqft}
                        onChange={handleChange}
                        type="number" min="0"
                        placeholder="Enter sq.ft e.g. 75000"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box', marginTop: '8px' }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Section: Address */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '11px', fontWeight: '700', color: '#7c3aed',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px'
                }}>Address Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                  {/* Full Address */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Full Address
                    </label>
                    <textarea name="address" value={formData.address} onChange={handleChange}
                      placeholder="Street, Area, Landmark..."
                      rows={2}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
                  </div>

                  {/* State — dropdown */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      State <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={e => {
                        // reset city when state changes
                        setFormData(prev => ({ ...prev, state: e.target.value, city: '' }));
                      }}
                      required
                      style={selectStyle}
                    >
                      <option value="">— Select state —</option>
                      {INDIA_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* City — dependent dropdown */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      City <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      disabled={!formData.state}
                      style={{
                        ...selectStyle,
                        background: formData.state ? 'white' : '#f9fafb',
                        color: formData.state ? '#111827' : '#9ca3af',
                        cursor: formData.state ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <option value="">
                        {formData.state ? '— Select city —' : '← Select state first'}
                      </option>
                      {(STATE_CITIES[formData.state] || []).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Pincode */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Pincode
                    </label>
                    <input name="pincode" value={formData.pincode} onChange={handleChange}
                      placeholder="e.g. 411001" maxLength={10}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Section: Contact */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  fontSize: '11px', fontWeight: '700', color: '#7c3aed',
                  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px'
                }}>Manager & Contact</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                  {/* Manager / Contact Person */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Manager Assigned
                    </label>
                    <input name="contactPerson" value={formData.contactPerson} onChange={handleChange}
                      placeholder="e.g. Rahul Patil"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Contact Number
                    </label>
                    <input name="contactPhone" value={formData.contactPhone} onChange={handleChange}
                      placeholder="e.g. +91 98765 43210" maxLength={20}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' }}>
                      Contact Email
                    </label>
                    <input name="contactEmail" value={formData.contactEmail} onChange={handleChange}
                      type="email" placeholder="e.g. warehouse@company.com"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Active toggle (edit only) */}
              {editingWh && (
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="isActive" name="isActive"
                    checked={formData.isActive} onChange={handleChange}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label htmlFor="isActive" style={{ fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
                    Warehouse is Active
                  </label>
                </div>
              )}

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  background: 'white', color: '#475569', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: saving ? '#a78bfa' : '#7c3aed', color: 'white',
                  fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {saving ? '⏳ Saving...' : (editingWh ? '💾 Update Warehouse' : '🏭 Create Warehouse')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
