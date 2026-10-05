import React, { useState } from 'react';
import {
  Menu,
  X,
  Lock,
  Sun,
  Moon,
  CalendarCheck,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import appLogoSm from '../../../assets/logosm.png';

export const Navbar = ({ onNavigateAdmin, onExploreTurfs, onBookNow }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-[0_1px_12px_rgba(0,0,0,0.03)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div
          className="flex items-center space-x-3 cursor-pointer select-none shrink-0 group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <img
              src={appLogoSm}
              alt="Namma Ooru Turf Logo"
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-none">
              Namma Ooru <span className="text-emerald-600 dark:text-emerald-400 font-bold">Turf</span>
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                Sports Ecosystem
              </span>
              <span className="text-[9px] text-slate-300 dark:text-slate-600">•</span>
              <span className="text-[9px] font-medium text-slate-400">v1.0</span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          <button
            onClick={() => scrollTo('how-it-works')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            How it Works
          </button>
          <button
            onClick={() => scrollTo('pricing')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            Vendor Plans
          </button>
          <button
            onClick={() => scrollTo('testimonials')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            Reviews
          </button>
          <button
            onClick={() => scrollTo('inquiries')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            Contact Desk
          </button>
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center space-x-2.5 shrink-0">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer"
            aria-label="Toggle theme"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-700 dark:text-slate-300" />}
          </button>

          {/* Contact / Inquiry CTA */}
          <button
            type="button"
            onClick={() => scrollTo('inquiries')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Contact Desk</span>
          </button>
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center space-x-1.5 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-700 dark:text-slate-300" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden relative z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-4 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => scrollTo('how-it-works')}
            className="block w-full text-left py-2 px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            How it Works
          </button>
          <button
            onClick={() => scrollTo('pricing')}
            className="block w-full text-left py-2 px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            Vendor Subscription Plans
          </button>
          <button
            onClick={() => scrollTo('testimonials')}
            className="block w-full text-left py-2 px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            Reviews & Testimonials
          </button>
          <button
            onClick={() => scrollTo('inquiries')}
            className="block w-full text-left py-2 px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
          >
            Contact & Support Desk
          </button>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            <button
              onClick={() => scrollTo('inquiries')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold text-center shadow-xs cursor-pointer"
            >
              Contact Desk / Inquiries
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
