import { useState, useEffect, useCallback } from 'react';

// ─── Toast Store (singleton event bus) ───────────────────────────────────────
const listeners = [];

export const toast = {
  success: (message, duration = 3500) => emit({ type: 'success', message, duration }),
  error:   (message, duration = 4000) => emit({ type: 'error',   message, duration }),
  info:    (message, duration = 3000) => emit({ type: 'info',    message, duration }),
  loading: (message)                  => emit({ type: 'loading', message, duration: 0 }),
};

function emit(payload) {
  const id = Date.now() + Math.random();
  listeners.forEach(fn => fn({ ...payload, id }));
  return id;
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => listeners.splice(listeners.indexOf(fn), 1);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const icons = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
    </svg>
  ),
  loading: (
    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  ),
};

const styles = {
  success: { bar: 'bg-emerald-500', icon: 'bg-emerald-100 text-emerald-600', title: 'text-emerald-800' },
  error:   { bar: 'bg-red-500',     icon: 'bg-red-100 text-red-600',         title: 'text-red-800'     },
  info:    { bar: 'bg-blue-500',    icon: 'bg-blue-100 text-blue-600',        title: 'text-blue-800'    },
  loading: { bar: 'bg-gray-400',    icon: 'bg-gray-100 text-gray-600',        title: 'text-gray-800'    },
};

const labels = { success: 'Success', error: 'Error', info: 'Info', loading: 'Please wait' };

// ─── Single Toast Item ────────────────────────────────────────────────────────
function ToastItem({ toast: t, onRemove }) {
  const [visible, setVisible] = useState(false);
  const s = styles[t.type] || styles.info;

  useEffect(() => {
    // Slide in
    const show = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    if (t.duration > 0) {
      const hide = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onRemove(t.id), 300);
      }, t.duration);
      return () => { clearTimeout(show); clearTimeout(hide); };
    }
    return () => clearTimeout(show);
  }, [t.id, t.duration, onRemove]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onRemove(t.id), 300);
  };

  return (
    <div
      className={`relative flex items-start gap-3 bg-white rounded-xl shadow-lg border border-gray-100 p-4 pr-10 w-80 overflow-hidden
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
    >
      {/* Colored left bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${s.bar}`} />

      {/* Icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${s.icon}`}>
        {icons[t.type]}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-xs font-semibold uppercase tracking-wide ${s.title}`}>
          {labels[t.type]}
        </p>
        <p className="text-sm text-gray-700 mt-0.5 leading-snug">{t.message}</p>
      </div>

      {/* Close */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress bar */}
      {t.duration > 0 && (
        <div className={`absolute bottom-0 left-0 h-0.5 ${s.bar} opacity-40`}
          style={{ animation: `shrink ${t.duration}ms linear forwards` }} />
      )}
    </div>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribe(t => setToasts(prev => [...prev, t]));
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <>
      <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </>
  );
}
