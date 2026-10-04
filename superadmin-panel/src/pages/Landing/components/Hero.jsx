import React from 'react';
import { Lock, ArrowRight, CalendarCheck, ShieldCheck, Clock, Zap } from 'lucide-react';
import { Turf3DCanvas } from './Turf3DCanvas';

export const Hero = ({ onNavigateAdmin, onExploreTurfs, onBookNow }) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Headline & Action Buttons */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.14]">
              Instant Turf Bookings.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400">
                Zero Concurrency Clashes.
              </span>{' '}
              Total Facility Control.
            </h1>

            {/* Supporting Subtext */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
              A unified ecosystem powering athletes, facility vendors, and platform administrators. Featuring{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">5-minute atomic slot locks</strong>, verified partner KYC onboarding, instant Razorpay settlements, and live match analytics.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={onBookNow || onExploreTurfs}
                className="w-full sm:w-auto flex items-center justify-center space-x-2.5 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <CalendarCheck size={16} />
                <span>Get Started & Explore</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={onNavigateAdmin}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-3.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold text-sm rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-xs transition cursor-pointer"
              >
                <Lock size={15} className="text-slate-500" />
                <span>Super Admin Portal</span>
              </button>
            </div>

            {/* Trust Highlights */}
            <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white">5 Min</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Atomic Slot Lock</p>
              </div>
              <div>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">100%</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Verified KYC Venues</p>
              </div>
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white">&lt; 60s</p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Auto Expiry Release</p>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Interactive Stadium Visual */}
          <div className="lg:col-span-6 relative">
            <div className="relative bg-white/70 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 rounded-3xl p-2 sm:p-4 shadow-xl dark:shadow-emerald-950/20">
              <Turf3DCanvas />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
