import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import appLogo from '../assets/logo.png';

export const LoginView = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('admin@zuna.com');
  const [password, setPassword] = useState('Cgs@001a');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
  };

  const handleAutofill = () => {
    setEmail('admin@zuna.com');
    setPassword('Cgs@001a');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img
            src={appLogo}
            alt="Namma Ooru Turf Logo"
            className="w-20 h-20 object-contain mx-auto mb-3"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Namma Ooru <span className="text-emerald-600">Turf</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">Super Admin Real-Time Platform Desk</p>
        </div>

        {/* Credentials Callout Card */}
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 mb-6 text-xs text-emerald-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <KeyRound size={15} className="shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-slate-900 text-[11px]">Default Credentials</p>
              <p className="text-[11px] text-emerald-800 font-mono font-medium">admin@zuna.com • Cgs@001a</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutofill}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm"
          >
            Auto-Fill
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@zuna.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          {error && (
            <div className="text-rose-700 text-xs bg-rose-50 border border-rose-200 rounded-xl p-3 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition duration-200 shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
