import React from 'react';
import { AlertOctagon, Home, ArrowLeft, RefreshCw, Compass } from 'lucide-react';
import appLogo from '../assets/logo.png';

export const NotFoundView = ({ onNavigateHome }) => {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="relative mb-6">
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150" />
        
        {/* 404 Header Card */}
        <div className="relative bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl max-w-md w-full">
          <img
            src={appLogo}
            alt="Turf App Logo"
            className="w-16 h-16 object-contain mx-auto mb-4"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full text-xs font-black uppercase tracking-wider mb-3">
            <AlertOctagon size={13} />
            <span>404 - Page Not Found</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Lost on the Pitch?
          </h1>
          
          <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
            The dashboard module or administrative section you are trying to access does not exist or has been relocated.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => (onNavigateHome ? onNavigateHome() : window.location.assign('/'))}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Home size={14} />
              <span>Back to Overview</span>
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              <RefreshCw size={14} />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Turf Super Admin Real-Time Operations Portal
      </p>
    </div>
  );
};
