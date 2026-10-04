import React, { useState } from 'react';
import {
  RotateCw,
  Bell,
  CheckCircle2,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import appLogoSm from '../assets/logosm.png';

export const Header = ({ onRefresh, isRefreshing, pendingCount = 0, onToggleSidebar }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-14 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shadow-[0_1px_12px_rgba(0,0,0,0.02)] select-none transition-colors duration-200">
      {/* Mobile Brand / Toggle Button (Logo only) */}
      <div className="flex items-center space-x-2 lg:hidden">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
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

        {/* Public Website Link */}
        <a
          href="/"
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 bg-white dark:bg-slate-800 hover:bg-emerald-50/50 dark:hover:bg-slate-700 text-xs font-bold transition shadow-2xs"
          title="Visit Public Landing Page"
        >
          <span>Website</span>
        </a>

        {/* Dark / Light Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-400 flex items-center justify-center transition border border-slate-200/80 dark:border-slate-700 shadow-2xs cursor-pointer"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Black Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-700" />}
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="group relative flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white rounded-full text-xs font-bold transition-all duration-150 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
          title="Refresh All Real-Time Data"
        >
          <RotateCw
            size={12}
            className={`text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-transform ${isRefreshing ? 'animate-spin text-emerald-600' : 'group-hover:rotate-180 duration-500'
              }`}
          />
          <span className="text-[10px] sm:text-[11px]"></span>
        </button>

        {/* Divider */}
        <div className="h-5 sm:h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition relative cursor-pointer"
            title="Notifications"
          >
            <Bell size={13} className="sm:w-3.5 sm:h-3.5" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-amber-500 text-white rounded-full text-[8px] sm:text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popup */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">System Notifications</span>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                  Live
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {pendingCount > 0 ? (
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200">
                    <p className="font-bold text-[11px]">Pending Partner KYC</p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                      {pendingCount} partner application(s) awaiting review.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 text-center text-slate-400 dark:text-slate-500 text-[11px]">
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
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-[10px] sm:text-xs flex items-center justify-center shadow-xs ring-2 ring-emerald-50 dark:ring-emerald-950">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};
