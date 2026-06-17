import { useState } from 'react';
import { Truck, User, Phone, Mail, Lock, Eye, EyeOff, MapPin, Car, FileText, CheckCircle, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';

const API = 'http://localhost:9999/api';

const VEHICLE_TYPES = [
  { value: 'BIKE',    label: 'Bike / Motorcycle', icon: '🏍️' },
  { value: 'SCOOTER', label: 'Scooter / Moped',   icon: '🛵' },
  { value: 'BICYCLE', label: 'Bicycle / Cycle',   icon: '��' },
  { value: 'CAR',     label: 'Car / Cab',          icon: '🚗' },
];

const CITIES = ['Pune', 'Mumbai', 'Nashik', 'Nagpur', 'Aurangabad', 'Solapur', 'Kolhapur', 'Thane', 'Navi Mumbai', 'Other'];

const STEPS = [
  { id: 1, label: 'Personal',  icon: User },
  { id: 2, label: 'Vehicle',   icon: Car },
  { id: 3, label: 'Documents', icon: FileText },
  { id: 4, label: 'Review',    icon: CheckCircle },
];

export default function DeliveryRegisterPage() {
  const [step, setStep]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '',
    password: '', confirmPassword: '', city: '', pincode: '', address: '',
    vehicleType: 'BIKE', vehicleNumber: '', vehicleModel: '',
    aadharNumber: '', drivingLicense: '', panNumber: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    setError('');
    if (step === 1) {
      if (!form.firstName.trim()) return setError('First name is required'), false;
      if (!form.lastName.trim())  return setError('Last name is required'), false;
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return setError('Valid email is required'), false;
      if (form.phoneNumber.length < 10) return setError('Valid 10-digit phone required'), false;
      if (!form.password || form.password.length < 6) return setError('Password must be at least 6 characters'), false;
      if (form.password !== form.confirmPassword) return setError('Passwords do not match'), false;
      if (!form.city) return setError('City is required'), false;
    }
    if (step === 2) {
      if (!form.vehicleNumber.trim()) return setError('Vehicle number is required'), false;
      if (!form.vehicleModel.trim())  return setError('Vehicle model is required'), false;
    }
    if (step === 3) {
      if (!form.aadharNumber.trim())   return setError('Aadhar number is required'), false;
      if (!form.drivingLicense.trim()) return setError('Driving license is required'), false;
    }
    return true;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const prev = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/delivery/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, phoneNumber: form.phoneNumber,
          password: form.password, city: form.city,
          pincode: form.pincode, address: form.address,
          vehicleType: form.vehicleType, vehicleNumber: form.vehicleNumber,
          vehicleModel: form.vehicleModel, aadharNumber: form.aadharNumber,
          drivingLicense: form.drivingLicense, panNumber: form.panNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Submission failed'); return; }
      setSubmitted(true);
    } catch { setError('Server error. Please try again.'); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div style={css.page}>
        <div style={{ ...css.card, textAlign: 'center', padding: '52px 40px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 32, boxShadow: '0 8px 24px rgba(22,163,74,0.25)' }}>🎉</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#111827' }}>Application Submitted!</h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
            Thank you <strong style={{ color: '#111827' }}>{form.firstName}</strong>! We have received your application.<br />
            A confirmation email has been sent to <strong style={{ color: '#7c3aed' }}>{form.email}</strong>.<br />
            Our team will review within <strong style={{ color: '#111827' }}>24 to 48 hours</strong>.
          </p>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginBottom: 28, textAlign: 'left' }}>
            {['Check your email for confirmation', 'Review takes 24 to 48 hours', 'You will get an approval email', 'Then login at the Delivery Portal'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 13, color: '#166534' }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>checkmark</span> {t}
              </div>
            ))}
          </div>
          <a href="/delivery/login" style={{ display: 'inline-block', padding: '12px 28px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
            Go to Login Page
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={css.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dr-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .dr-input:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important; outline: none; }
        .dr-select:focus { border-color: #7c3aed !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.1) !important; outline: none; }
        .dr-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg,#6d28d9,#5b21b6) !important; transform: translateY(-1px); }
        .dr-btn-secondary:hover { background: #f3f4f6 !important; }
        .vehicle-opt:hover { border-color: #7c3aed !important; background: #faf5ff !important; }
      `}</style>

      <div style={css.card}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 6px 18px rgba(124,58,237,0.3)' }}>
            <Truck size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Become a Delivery Partner</h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#6b7280' }}>Fill in your details to apply</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEPS.map((st, i) => {
            const done = step > st.id, active = step === st.id;
            return (
              <div key={st.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, transition: 'all 0.3s',
                    background: done ? '#16a34a' : active ? '#7c3aed' : '#f3f4f6',
                    color: done || active ? '#fff' : '#9ca3af',
                    boxShadow: active ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
                  }}>
                    {done ? 'v' : st.id}
                  </div>
                  <span style={{ fontSize: 10, marginTop: 4, fontWeight: active ? 700 : 400, color: active ? '#7c3aed' : done ? '#16a34a' : '#9ca3af' }}>{st.label}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ height: 2, flex: 1, marginBottom: 18, background: step > st.id ? '#16a34a' : '#e5e7eb', transition: 'background 0.3s' }} />}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="First Name *"><input className="dr-input" style={css.input} placeholder="Raju" value={form.firstName} onChange={e => set('firstName', e.target.value)} /></F>
              <F label="Last Name *"><input className="dr-input" style={css.input} placeholder="Sharma" value={form.lastName} onChange={e => set('lastName', e.target.value)} /></F>
            </div>
            <F label="Email Address *" icon={<Mail size={14} color="#9ca3af" />}>
              <input className="dr-input" style={{ ...css.input, paddingLeft: 36 }} type="email" placeholder="raju@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </F>
            <F label="Phone Number *" icon={<Phone size={14} color="#9ca3af" />}>
              <input className="dr-input" style={{ ...css.input, paddingLeft: 36 }} type="tel" placeholder="9876543210" maxLength={10} value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </F>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Password *" icon={<Lock size={14} color="#9ca3af" />} right={<button type="button" onClick={() => setShowPass(p => !p)} style={css.eyeBtn}>{showPass ? <EyeOff size={14} color="#9ca3af" /> : <Eye size={14} color="#9ca3af" />}</button>}>
                <input className="dr-input" style={{ ...css.input, paddingLeft: 36, paddingRight: 36 }} type={showPass ? 'text' : 'password'} placeholder="Min 6 chars" value={form.password} onChange={e => set('password', e.target.value)} />
              </F>
              <F label="Confirm Password *" icon={<Lock size={14} color="#9ca3af" />} right={<button type="button" onClick={() => setShowConfirm(p => !p)} style={css.eyeBtn}>{showConfirm ? <EyeOff size={14} color="#9ca3af" /> : <Eye size={14} color="#9ca3af" />}</button>}>
                <input className="dr-input" style={{ ...css.input, paddingLeft: 36, paddingRight: 36 }} type={showConfirm ? 'text' : 'password'} placeholder="Re-enter" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
              </F>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="City *">
                <div style={{ position: 'relative' }}>
                  <MapPin size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <ChevronDown size={14} color="#9ca3af" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <select className="dr-select" style={{ ...css.input, paddingLeft: 32, paddingRight: 28, appearance: 'none', cursor: 'pointer' }} value={form.city} onChange={e => set('city', e.target.value)}>
                    <option value="">Select city</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </F>
              <F label="Pincode">
                <input className="dr-input" style={css.input} placeholder="411001" maxLength={6} value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </F>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={css.label}>Vehicle Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                {VEHICLE_TYPES.map(v => (
                  <div key={v.value} className="vehicle-opt" onClick={() => set('vehicleType', v.value)}
                    style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10,
                      background: form.vehicleType === v.value ? '#faf5ff' : '#fff',
                      border: `2px solid ${form.vehicleType === v.value ? '#7c3aed' : '#e5e7eb'}` }}>
                    <span style={{ fontSize: 22 }}>{v.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: form.vehicleType === v.value ? '#7c3aed' : '#374151' }}>{v.label.split(' / ')[0]}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{v.label.split(' / ')[1] || ''}</div>
                    </div>
                    {form.vehicleType === v.value && <span style={{ marginLeft: 'auto', color: '#7c3aed', fontWeight: 700 }}>v</span>}
                  </div>
                ))}
              </div>
            </div>
            <F label="Vehicle Registration Number *" icon={<Car size={14} color="#9ca3af" />}>
              <input className="dr-input" style={{ ...css.input, paddingLeft: 36 }} placeholder="MH12AB1234" value={form.vehicleNumber} onChange={e => set('vehicleNumber', e.target.value.toUpperCase())} />
            </F>
            <F label="Vehicle Make and Model *" icon={<Car size={14} color="#9ca3af" />}>
              <input className="dr-input" style={{ ...css.input, paddingLeft: 36 }} placeholder="Honda Activa 6G" value={form.vehicleModel} onChange={e => set('vehicleModel', e.target.value)} />
            </F>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                Provide accurate document details. All information is kept confidential and used only for verification.
              </p>
            </div>
            <F label="Aadhar Card Number *" icon={<FileText size={14} color="#9ca3af" />}>
              <input className="dr-input" style={{ ...css.input, paddingLeft: 36 }} placeholder="1234 5678 9012" maxLength={14} value={form.aadharNumber} onChange={e => set('aadharNumber', e.target.value)} />
            </F>
            <F label="Driving License Number *" icon={<FileText size={14} color="#9ca3af" />}>
              <input className="dr-input" style={{ ...css.input, paddingLeft: 36 }} placeholder="MH1234567890123" value={form.drivingLicense} onChange={e => set('drivingLicense', e.target.value.toUpperCase())} />
            </F>
            <F label="PAN Card Number (optional)" icon={<FileText size={14} color="#9ca3af" />}>
              <input className="dr-input" style={{ ...css.input, paddingLeft: 36 }} placeholder="ABCDE1234F" maxLength={10} value={form.panNumber} onChange={e => set('panNumber', e.target.value.toUpperCase())} />
            </F>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { title: 'Personal Info', rows: [['Name', `${form.firstName} ${form.lastName}`], ['Email', form.email], ['Phone', form.phoneNumber], ['City', `${form.city}${form.pincode ? ' - ' + form.pincode : ''}`]] },
              { title: 'Vehicle Info', rows: [['Type', VEHICLE_TYPES.find(v => v.value === form.vehicleType)?.label || form.vehicleType], ['Number', form.vehicleNumber], ['Model', form.vehicleModel]] },
              { title: 'Documents', rows: [['Aadhar', form.aadharNumber], ['License', form.drivingLicense], ...(form.panNumber ? [['PAN', form.panNumber]] : [])] },
            ].map(sec => (
              <div key={sec.title} style={{ background: '#f8fafc', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '8px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#374151' }}>{sec.title}</div>
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sec.rows.map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{value || '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#166534', lineHeight: 1.7 }}>
                By submitting, you confirm all information is accurate. Confirmation email will be sent to {form.email}. Admin will review within 24 to 48 hours.
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {step > 1 && (
            <button className="dr-btn-secondary" onClick={prev}
              style={{ flex: 1, padding: '11px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
              Back
            </button>
          )}
          {step < 4 ? (
            <button className="dr-btn-primary" onClick={next}
              style={{ flex: step > 1 ? 2 : 1, padding: '11px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(124,58,237,0.25)', transition: 'all 0.15s' }}>
              Next
            </button>
          ) : (
            <button className="dr-btn-primary" onClick={handleSubmit} disabled={loading}
              style={{ flex: 2, padding: '11px', background: loading ? '#e5e7eb' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', color: loading ? '#9ca3af' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: '#9ca3af' }}>
          Already approved? <a href="/delivery/login" style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Login here</a>
        </p>
      </div>
    </div>
  );
}

function F({ label, icon, right, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}>{icon}</span>}
        {children}
        {right && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>{right}</span>}
      </div>
    </div>
  );
}

const css = {
  page: {
    minHeight: '100vh', background: '#f8fafc',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '32px 16px', fontFamily: "'Inter','Segoe UI',sans-serif",
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '32px 28px',
    width: '100%', maxWidth: 500,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
  },
  label: { fontSize: 12, fontWeight: 600, color: '#374151' },
  input: {
    width: '100%', padding: '10px 12px',
    background: '#fff', border: '1.5px solid #e2e8f0',
    borderRadius: 8, color: '#111827', fontSize: 13,
    boxSizing: 'border-box',
  },
  eyeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' },
};
