import { useState, useEffect } from 'react';
import { Warehouse, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';

const API = 'http://localhost:9999/api';

const C = {
  dark:       '#F8FAFC',
  card:       '#FFFFFF',
  border:     '#E2E8F0',
  teal:       '#0D9488',
  tealDark:   '#0A7A70',
  tealBg:     'rgba(13,148,136,0.08)',
  tealBorder: 'rgba(13,148,136,0.25)',
  text:       '#1E293B',
  textMuted:  '#64748B',
};

export default function WarehouseLoginPage() {
  // ✅ Set page title
  useEffect(() => {
    document.title = 'Warehouse Login - Inventory Hub';
    return () => { document.title = 'Inventory Hub'; };
  }, []);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.token) {
        setError(data.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      const role = data.role || data.userRole || '';
      const warehouseRoles = [
        'WAREHOUSE_MANAGER', 'RECEIVING', 'AUDITOR',
        'PICKER', 'PACKER', 'SHIPPING', 'VIEWER',
      ];
      const isWarehouse = warehouseRoles.includes(role);

      if (!isWarehouse) {
        setError('This portal is only for Warehouse Staff.');
        setLoading(false);
        return;
      }

      // ✅ Use sessionStorage for warehouse sessions (tab-specific)
      sessionStorage.setItem('warehouseToken',     data.token);
      sessionStorage.setItem('warehouseAuthToken', data.token);
      sessionStorage.setItem('warehouseUserRole',  role);
      sessionStorage.setItem('warehouseCustomerId', data.id || data.customerId || '');
      sessionStorage.setItem('warehouseUserId',    data.id || data.customerId || '');
      sessionStorage.setItem('warehouseUserName',  `${data.firstName} ${data.lastName}`);
      sessionStorage.setItem('warehouseFirstName', data.firstName);
      sessionStorage.setItem('warehouseLastName',  data.lastName);
      sessionStorage.setItem('warehouseEmail',     data.email || email); // ✅ store email
      sessionStorage.setItem('warehouseJustLoggedIn', 'true');
      
      // ✅ Redirect after ensuring sessionStorage is set
      window.location.href = '/warehouse/dashboard';
    } catch (err) {
      console.error('Login error:', err);
      setError('Server error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .wl-input:focus { border-color: ${C.teal} !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.15) !important; outline: none; }
        .wl-btn:hover:not(:disabled) { background: ${C.tealDark} !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(13,148,136,0.4) !important; }
        .wl-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoIcon}><Warehouse size={28} color="#fff" strokeWidth={2.5} /></div>
          <h1 style={s.title}>Warehouse Portal</h1>
          <p style={s.subtitle}>Sign in to your warehouse account</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} autoComplete="on">
          <div style={s.fieldWrap}>
            <label style={s.label}>Email</label>
            <div style={s.inputWrap}>
              <Mail size={16} color={C.textMuted} style={s.inputIcon} />
              <input
                className="wl-input"
                type="email"
                name="email"
                id="warehouse-email"
                autoComplete="email"
                required
                placeholder="warehouse@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={s.input}
              />
            </div>
          </div>

          <div style={s.fieldWrap}>
            <label style={s.label}>Password</label>
            <div style={s.inputWrap}>
              <Lock size={16} color={C.textMuted} style={s.inputIcon} />
              <input
                className="wl-input"
                type={showPass ? 'text' : 'password'}
                name="password"
                id="warehouse-password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...s.input, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)} style={s.eyeBtn}>
                {showPass ? <EyeOff size={16} color={C.textMuted} /> : <Eye size={16} color={C.textMuted} />}
              </button>
            </div>
          </div>

          {error && <div style={s.errorBox}>❌ {error}</div>}

          <button className="wl-btn" type="submit" disabled={loading} style={s.btn}>
            {loading
              ? <><div style={s.spinner} /> Signing in…</>
              : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <p style={s.footer}>
          Not warehouse staff?{' '}
          <a href="/" style={{ color: C.teal, textDecoration: 'none', fontWeight: 600 }}>Go to Store</a>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: `#F1F5F9`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 20,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  logoWrap: { textAlign: 'center', marginBottom: 32 },
  logoIcon: {
    width: 64, height: 64, borderRadius: '50%',
    background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: `0 8px 24px rgba(13,148,136,0.35)`,
  },
  title:    { margin: 0, fontSize: 24, fontWeight: 700, color: C.text },
  subtitle: { margin: '6px 0 0', fontSize: 14, color: C.textMuted },  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  label:    { fontSize: 13, fontWeight: 600, color: C.textMuted, letterSpacing: '0.3px' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  input: {
    width: '100%',
    padding: '11px 14px 11px 40px',
    background: '#F8FAFC',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.text,
    fontSize: 14,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
  },
  errorBox: {
    background: 'rgba(220,38,38,0.12)',
    border: '1px solid rgba(220,38,38,0.3)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#FCA5A5',
  },
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '13px 0',
    background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`,
    border: 'none', borderRadius: 10,
    color: '#fff', fontWeight: 700, fontSize: 15,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 4,
    boxShadow: `0 4px 14px rgba(13,148,136,0.3)`,
  },
  spinner: {
    width: 16, height: 16,
    border: `2px solid rgba(255,255,255,0.3)`,
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footer: { textAlign: 'center', marginTop: 24, fontSize: 13, color: C.textMuted },
};
