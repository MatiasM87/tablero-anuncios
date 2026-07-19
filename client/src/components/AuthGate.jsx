import React, { useState, useEffect } from 'react';
import { Lock, KeyRound } from 'lucide-react';
import { checkAuth, login, changePassword, getToken } from '../utils/api.js';

function AuthShell({ icon, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            {icon}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginForm({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await login(password);
      onSuccess(result.mustChange);
    } catch (err) {
      setError(err.message || 'Clave incorrecta');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      icon={<Lock size={22} />}
      title="Panel de administración"
      subtitle="Ingresá la clave para continuar"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Clave"
          autoFocus
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </AuthShell>
  );
}

function ChangePasswordForm({ onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (newPassword.trim().length < 4) {
      setError('La clave debe tener al menos 4 caracteres');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las claves no coinciden');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await changePassword(newPassword);
      onSuccess();
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la clave');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      icon={<KeyRound size={22} />}
      title="Elegí tu nueva clave"
      subtitle="Estás usando la clave predeterminada. Cambiala para proteger el panel."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nueva clave"
          autoFocus
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repetir clave"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy || !newPassword || !confirm}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar nueva clave'}
        </button>
      </form>
    </AuthShell>
  );
}

// Wraps the admin pages: shows login (and forced first-time password change)
// before letting the protected content render.
export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking'); // checking | login | change | ok

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setStatus('login');
        return;
      }
      try {
        const result = await checkAuth();
        setStatus(result.ok ? (result.mustChange ? 'change' : 'ok') : 'login');
      } catch {
        setStatus('login');
      }
    })();
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'login') {
    return <LoginForm onSuccess={(mustChange) => setStatus(mustChange ? 'change' : 'ok')} />;
  }

  if (status === 'change') {
    return <ChangePasswordForm onSuccess={() => setStatus('ok')} />;
  }

  return children;
}
