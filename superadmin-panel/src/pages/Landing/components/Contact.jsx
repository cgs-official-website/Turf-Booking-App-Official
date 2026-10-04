import React from 'react';
import { Mail, Phone, MapPin, Clock, MessageSquare, ShieldCheck } from 'lucide-react';
import { InquiryForm } from '../../../components/InquiryForm';

export const Contact = () => {
  return (
    <section id="inquiries" className="scroll-mt-16 py-16 lg:py-24 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Ecosystem Operations Desk
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Have Questions or Need Onboarding Help?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
            Our platform engineering and vendor relations desk responds promptly to players, turf owners, and tournament organizers.
          </p>
        </div>

        {/* 2-Column Grid: Contact Details & Inquiry Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Direct Info Cards */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Direct Communication Channels
              </h3>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Email Operations</p>
                    <a href="mailto:support@turf.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                      support@turf.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Partner Hotline & WhatsApp</p>
                    <p className="text-slate-600 dark:text-slate-300">+91 98765 43210 (Mon - Sun, 6 AM - 11 PM)</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Headquarters</p>
                    <p className="text-slate-600 dark:text-slate-300">Sports Technology Park, Anna Nagar, Chennai, TN - 600040</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck size={16} />
                <span>100% Guaranteed 2-Hour SLA Response Time</span>
              </div>
            </div>

            {/* Quick SLA Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Want to register your Turf?</h4>
              <p>Download the Turf Vendor mobile app or submit the form on the right. Our onboarding specialist will inspect your venue photos and activate your account within 24 hours.</p>
            </div>
          </div>

          {/* Right Column: Interactive Inquiry Form */}
          <div className="lg:col-span-7">
            <InquiryForm sourcePage="Landing Page — Contact Desk" initialModule="General" />
          </div>

        </div>

      </div>
    </section>
  );
};
