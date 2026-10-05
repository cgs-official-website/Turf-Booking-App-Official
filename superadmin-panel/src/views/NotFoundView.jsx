import React from 'react';
import { AlertOctagon, Home, RefreshCw } from 'lucide-react';
import appLogo from '../assets/logo.png';

export const NotFoundView = ({ onNavigateHome }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200 transition-colors">
      <div className="relative mb-6 max-w-md w-full">
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl rounded-full scale-150" />

        {/* 404 Header Card */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
          <img
            src={appLogo}
            alt="Turf App Logo"
            className="w-16 h-16 object-contain mx-auto mb-4"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-full text-xs font-black uppercase tracking-wider mb-3">
            <AlertOctagon size={13} />
            <span>404 - Page Not Found</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            Lost on the Pitch?
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">
            The page or administrative section you are trying to access does not exist, has been relocated, or is restricted.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => (onNavigateHome ? onNavigateHome() : window.location.assign('/'))}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Home size={14} />
              <span>Back to Home</span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        © {new Date().getFullYear()} Namma Ooru Turf Ecosystem
      </p>
    </div>
  );
};
