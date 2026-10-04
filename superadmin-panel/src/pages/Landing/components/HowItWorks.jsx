import React from 'react';
import {
  FileCheck2,
  CalendarDays,
  Lock,
  Trophy,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const HowItWorks = ({ onBookNow, onNavigateAdmin }) => {
  const steps = [
    {
      step: '01',
      title: 'Partner KYC & Verification',
      desc: 'Turf facility owners onboard via the Vendor App by uploading legal business certificates, PAN/GST, and venue photos for Super Admin audit.',
      tag: 'Audited in < 24 Hours',
      badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-800/80',
      icon: FileCheck2,
    },
    {
      step: '02',
      title: 'Court Matrix & Dynamic Slots',
      desc: 'Facility managers configure pitches (Football, Box Cricket, Badminton), custom hourly pricing, peak weekend surcharges, and instant blackout times.',
      tag: 'Real-Time Schedule Matrix',
      badgeColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200/80 dark:border-purple-800/80',
      icon: CalendarDays,
    },
    {
      step: '03',
      title: '5-Minute Atomic Slot Lock',
      desc: 'When a player initiates checkout, our engine holds the court atomically for 300 seconds. No double bookings. Secure digital payment via Razorpay.',
      tag: 'Zero Double Bookings',
      badgeColor: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      icon: Lock,
    },
    {
      step: '04',
      title: 'QR Check-in & Live Matches',
      desc: 'Players scan QR code at venue turnstiles, initiate digital coin toss in community lobbies, and track live ball-by-ball matches with instant payout settlement.',
      tag: 'Automated Escrow Settlements',
      badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/80',
      icon: Trophy,
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-16 py-16 lg:py-24 bg-slate-50/70 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            End-To-End Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            How the Ecosystem Operates in Real Time
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
            From turf ground onboarding to the final referee whistle, every workflow is synchronized across mobile apps, APIs, and the admin portal.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs hover:shadow-lg dark:hover:shadow-emerald-950/20 transition-all duration-200 group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-black text-sm flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all duration-200">
                      {item.step}
                    </span>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                      <Icon size={18} />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold border ${item.badgeColor}`}>
                    {item.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
