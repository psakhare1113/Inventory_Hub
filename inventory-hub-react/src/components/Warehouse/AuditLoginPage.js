import { useState, useEffect } from 'react';
import { Search, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';

const API = 'http://localhost:9999/api';

const C = {
  indigo:     '#4f46e5',
  indigoDark: '#3730a3',
  indigoBg:   'rgba(79,70,229,0.08)',
  card:       '#FFFFFF',
  border:     '#E2E8F0',
  text:       '#1E293B',
  textMuted:  '#64748B',
};

export default function AuditLoginPage() {
  useEffect(() => {
    document.title = 'Audit Portal Login - Inventory Hub';
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
      const allowed = ['AUDITOR', 'VIEWER'];

      if (!allowed.includes(role)) {
        setError('This portal is only for Auditor and Viewer accounts.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('warehouseToken',      data.token);
      sessionStorage.setItem('warehouseAuthToken',  data.token);
      sessionStorage.setItem('warehouseUserRole',   role);
      sessionStorage.setItem('warehouseCustomerId', data.id || data.customerId || '');
      sessionStorage.setItem('warehouseUserId',     data.id || data.customerId || '');
      sessionStorage.setItem('warehouseUserName',   `${data.firstName} ${data.lastName}`);
      sessionStorage.setItem('warehouseFirstName',  data.firstName);
      sessionStorage.setItem('warehouseLastName',   data.lastName);
      sessionStorage.setItem('warehouseEmail',      data.email || email);
      sessionStorage.setItem('warehouseJustLoggedIn', 'true');

      window.location.href = '/audit/dashboard';
    } catch (err) {
      setError('Server error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .al-input:focus { border-color: ${C.indigo} !important; box-shadow: 0 0 0 3px rgba(79,70,229,0.15) !important; outline: none; }
        .al-btn:hover:not(:disabled) { background: ${C.indigoDark} !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,0.4) !important; }
        .al-btn:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(79,70,229,0.35)' }}>
            <Search size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.text }}>Audit Portal</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: C.textMuted }}>Sign in with your Auditor or Viewer account</p>
        </div>

        {/* Role badges */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          <span style={{ padding: '4px 14px', borderRadius: 20, background: '#eef2ff', color: C.indigo, fontSize: 12, fontWeight: 700, border: '1px solid #c7d2fe' }}>📋 Auditor</span>
          <span style={{ padding: '4px 14px', borderRadius: 20, background: '#f8fafc', color: '#6b7280', fontSize: 12, fontWeight: 700, border: '1px solid #e2e8f0' }}>👁️ Viewer</span>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} autoComplete="on">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color={C.textMuted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="al-input" type="email" autoComplete="email" required placeholder="auditor@company.com" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '11px 14px 11px 40px', background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color={C.textMuted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="al-input" type={showPass ? 'text' : 'password'} autoComplete="current-password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '11px 44px 11px 40px', background: '#F8FAFC', border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                {showPass ? <EyeOff size={16} color={C.textMuted} /> : <Eye size={16} color={C.textMuted} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              ❌ {error}
            </div>
          )}

          <button className="al-btn" type="submit" disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', background: `linear-gradient(135deg, ${C.indigo}, ${C.indigoDark})`, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'all 0.2s', marginTop: 4, boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
            {loading
              ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Signing in…</>
              : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: C.textMuted }}>
          Warehouse staff?{' '}
          <a href="/warehouse/login" style={{ color: '#0d9488', textDecoration: 'none', fontWeight: 600 }}>Warehouse Portal</a>
        </p>
      </div>
    </div>
  );
}
