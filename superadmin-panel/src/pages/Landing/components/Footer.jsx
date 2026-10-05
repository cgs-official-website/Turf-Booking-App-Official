import React from 'react';
import appLogoSm from '../../../assets/logosm.png';

export const Footer = ({ onNavigateAdmin, onOpenInquiryModal }) => {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <img
              src={appLogoSm}
              alt="Namma Ooru Turf Logo"
              className="w-9 h-9 object-contain rounded-xl shadow-xs"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-none">
                Namma Ooru <span className="text-emerald-600 dark:text-emerald-400 font-bold">Turf</span>
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Sports Facility Reservation & Management Ecosystem
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <button
              onClick={() => scrollTo('how-it-works')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
            >
              Workflow
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
            >
              Plans
            </button>
            <button
              onClick={() => scrollTo('testimonials')}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
            >
              Reviews
            </button>
            <button
              onClick={onOpenInquiryModal}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              Submit Inquiry
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <p>© {new Date().getFullYear()} Namma Ooru Turf Ecosystem. All rights reserved.</p>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-bold">System Status: All Services Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
