import React, { useState } from 'react';
import {
  RotateCw,
  Bell,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import appLogoSm from '../assets/logosm.png';

export const Header = ({ onRefresh, isRefreshing, pendingCount = 0, onToggleSidebar }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-14 bg-white/95 border-b border-slate-200/80 sticky top-0 z-30 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.02)] select-none">
      {/* Mobile Brand / Toggle Button (Logo only) */}
      <div className="flex items-center space-x-2 lg:hidden">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          title="Open menu"
        >
          <Menu size={20} />
        </button>
        <img
          src={appLogoSm}
          alt="Namma Ooru Turf"
          className="w-8 h-8 object-contain rounded-lg"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3 ml-auto shrink-0">
        {/* Live Pulse Status Capsule */}
        <div className="hidden xs:flex items-center space-x-1.5 sm:space-x-2 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-black text-emerald-800 tracking-wide uppercase">
            Live Sync
          </span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="group relative flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-white hover:bg-slate-50 active:scale-95 disabled:opacity-50 text-slate-700 hover:text-slate-900 rounded-full text-xs font-bold transition-all duration-150 border border-slate-200 shadow-2xs hover:border-slate-300"
          title="Refresh All Real-Time Data"
        >
          <RotateCw
            size={12}
            className={`text-slate-500 group-hover:text-emerald-600 transition-transform ${
              isRefreshing ? 'animate-spin text-emerald-600' : 'group-hover:rotate-180 duration-500'
            }`}
          />
          <span className="text-[10px] sm:text-[11px]">Refresh</span>
        </button>

        {/* Divider */}
        <div className="h-5 sm:h-6 w-px bg-slate-200 mx-0.5"></div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center transition relative"
            title="Notifications"
          >
            <Bell size={13} className="sm:w-3.5 sm:h-3.5" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-amber-500 text-white rounded-full text-[8px] sm:text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popup */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white border border-slate-200 rounded-2xl p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-bold text-slate-900">System Notifications</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                  Live
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {pendingCount > 0 ? (
                  <div className="p-2 bg-amber-50 border border-amber-200/70 rounded-xl text-amber-900">
                    <p className="font-bold text-[11px]">Pending Partner KYC</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      {pendingCount} partner application(s) awaiting review.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 text-center text-slate-400 text-[11px]">
                    <CheckCircle2 size={18} className="mx-auto text-emerald-500 mb-1" />
                    All tasks up to date
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Quick Avatar Capsule */}
        <div className="hidden xs:flex items-center space-x-2 pl-0.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-[10px] sm:text-xs flex items-center justify-center shadow-xs ring-2 ring-emerald-50">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};
