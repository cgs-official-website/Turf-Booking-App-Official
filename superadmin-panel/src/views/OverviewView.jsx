import React from 'react';
import { KpiCards } from '../components/KpiCards';
import { Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

export const OverviewView = ({ stats = {}, recentBookings = [], recentVendors = [], onNavigateTab }) => {
  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <KpiCards stats={stats} />

      {/* Two Column Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Bookings Stream */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <h3 className="font-extrabold text-slate-900 text-sm">Recent Platform Bookings</h3>
            </div>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center space-x-1 font-bold"
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <p className="text-slate-400 text-xs py-8 text-center font-medium">No platform bookings recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentBookings.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{b.turfName || 'Turf Facility'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {b.sport || 'Cricket'} • {b.date} ({b.startTime} - {b.endTime})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-600 text-xs">₹{b.amount || 0}</span>
                    <span
                      className={`block text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'confirmed'
                          ? 'text-emerald-600'
                          : b.status === 'completed'
                          ? 'text-blue-600'
                          : b.status === 'cancelled'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending KYC Approval Queue */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-amber-500" />
              <h3 className="font-extrabold text-slate-900 text-sm">Pending KYC & Turf Verifications</h3>
            </div>
            <button
              onClick={() => onNavigateTab('kyc')}
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center space-x-1 font-bold"
            >
              <span>Review Desk</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {recentVendors.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 size={28} className="text-emerald-500 mx-auto" />
              <p className="text-slate-900 font-bold text-xs">All Partners Verified</p>
              <p className="text-slate-500 text-[11px]">No pending KYC applications waiting in the queue.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentVendors.slice(0, 5).map((v) => (
                <div
                  key={v.uid || v.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{v.name || 'Partner'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {v.businessName || 'Business Partner'} • {v.phone || v.email || 'No contact'}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateTab('kyc')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
