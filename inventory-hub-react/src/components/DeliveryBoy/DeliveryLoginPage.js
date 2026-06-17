import { useState } from 'react';
import { Truck, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';

const API = 'http://localhost:9999/api';

const G = {
  dark:       '#1A1A2E',
  card:       '#16213E',
  border:     '#0F3460',
  gold:       '#D4A017',
  goldDark:   '#B8860B',
  goldBg:     'rgba(212,160,23,0.08)',
  goldBorder: 'rgba(212,160,23,0.25)',
  text:       '#F0E6D3',
  textMuted:  'rgba(240,230,211,0.55)',
};

export default function DeliveryLoginPage() {
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
        return;
      }

      if (!data.isDeliveryBoy) {
        setError('This portal is only for Delivery Partners.');
        return;
      }

      // Save session in sessionStorage so each tab has its own delivery boy session
      sessionStorage.setItem('token',        data.token);
      sessionStorage.setItem('authToken',    data.token);
      sessionStorage.setItem('userRole',     'DELIVERY_BOY');
      sessionStorage.setItem('isDeliveryBoy','true');
      sessionStorage.setItem('customerId',   data.customerId);
      sessionStorage.setItem('userName',     `${data.firstName} ${data.lastName}`);
      sessionStorage.setItem('firstName',    data.firstName);
      sessionStorage.setItem('lastName',     data.lastName);

      window.location.href = '/delivery/dashboard';
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dl-input:focus { border-color: ${G.gold} !important; box-shadow: 0 0 0 3px rgba(212,160,23,0.15) !important; outline: none; }
        .dl-btn:hover:not(:disabled) { background: ${G.goldDark} !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(212,160,23,0.4) !important; }
        .dl-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoIcon}><Truck size={28} color={G.dark} strokeWidth={2.5} /></div>
          <h1 style={s.title}>Delivery Portal</h1>
          <p style={s.subtitle}>Sign in to your delivery account</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div style={s.fieldWrap}>
            <label style={s.label}>Email</label>
            <div style={s.inputWrap}>
              <Mail size={16} color={G.textMuted} style={s.inputIcon} />
              <input
                className="dl-input"
                type="email"
                required
                placeholder="delivery@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={s.input}
              />
            </div>
          </div>

          {/* Password */}
          <div style={s.fieldWrap}>
            <label style={s.label}>Password</label>
            <div style={s.inputWrap}>
              <Lock size={16} color={G.textMuted} style={s.inputIcon} />
              <input
                className="dl-input"
                type={showPass ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...s.input, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)} style={s.eyeBtn}>
                {showPass ? <EyeOff size={16} color={G.textMuted} /> : <Eye size={16} color={G.textMuted} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={s.errorBox}>❌ {error}</div>
          )}

          {/* Submit */}
          <button className="dl-btn" type="submit" disabled={loading} style={s.btn}>
            {loading
              ? <><div style={s.spinner} /> Signing in…</>
              : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <p style={s.footer}>
          Not a delivery partner?{' '}
          <a href="/" style={{ color: G.gold, textDecoration: 'none', fontWeight: 600 }}>Go to Store</a>
          <span style={{ color: G.textMuted, margin: '0 8px' }}>|</span>
          <a href="/delivery/register" style={{ color: G.goldLight, textDecoration: 'none', fontWeight: 600 }}>Apply as Delivery Partner →</a>
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${G.dark} 0%, #0d1b2a 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    background: G.card,
    border: `1px solid ${G.border}`,
    borderRadius: 20,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  logoWrap: { textAlign: 'center', marginBottom: 32 },
  logoIcon: {
    width: 64, height: 64, borderRadius: '50%',
    background: `linear-gradient(135deg, ${G.gold}, ${G.goldDark})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: `0 8px 24px rgba(212,160,23,0.35)`,
  },
  title:    { margin: 0, fontSize: 24, fontWeight: 700, color: G.text },
  subtitle: { margin: '6px 0 0', fontSize: 14, color: G.textMuted },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  label:    { fontSize: 13, fontWeight: 600, color: G.textMuted, letterSpacing: '0.3px' },
  inputWrap: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  input: {
    width: '100%',
    padding: '11px 14px 11px 40px',
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${G.border}`,
    borderRadius: 10,
    color: G.text,
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
    background: `linear-gradient(135deg, ${G.gold}, ${G.goldDark})`,
    border: 'none', borderRadius: 10,
    color: G.dark, fontWeight: 700, fontSize: 15,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 4,
    boxShadow: `0 4px 14px rgba(212,160,23,0.3)`,
  },
  spinner: {
    width: 16, height: 16,
    border: `2px solid rgba(26,26,46,0.3)`,
    borderTopColor: G.dark,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  footer: { textAlign: 'center', marginTop: 24, fontSize: 13, color: G.textMuted },
};
