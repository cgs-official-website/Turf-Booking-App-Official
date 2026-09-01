import React from 'react';
import {
  IndianRupee,
  CalendarCheck,
  Building2,
  Clock,
  Users,
  UserCheck,
  Trophy,
  AlertTriangle,
} from 'lucide-react';

export const KpiCards = ({ stats = {} }) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const primaryCards = [
    {
      label: 'Total Platform Revenue',
      value: formatCurrency(stats.totalRevenue),
      subtext: 'From confirmed bookings',
      icon: IndianRupee,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Total Bookings',
      value: stats.totalBookings || 0,
      subtext: `${stats.confirmedBookings || 0} confirmed • ${stats.completedBookings || 0} completed`,
      icon: CalendarCheck,
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-200',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Active Turfs',
      value: stats.activeTurfs || 0,
      subtext: `${stats.totalTurfs || 0} total (${stats.pendingTurfs || 0} pending review)`,
      icon: Building2,
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-200',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Pending KYC Reviews',
      value: stats.pendingKycs || 0,
      subtext: 'Awaiting your approval',
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200',
      valueColor: stats.pendingKycs > 0 ? 'text-amber-600' : 'text-slate-900',
    },
  ];

  const secondaryCards = [
    { label: 'Registered Players', value: stats.totalUsers || 0, icon: Users, color: 'text-slate-900' },
    { label: 'Turf Partners', value: stats.totalVendors || 0, icon: UserCheck, color: 'text-slate-900' },
    { label: 'Live Matches', value: stats.liveMatches || 0, icon: Trophy, color: 'text-emerald-600' },
    { label: 'Open Reports', value: stats.openReports || 0, icon: AlertTriangle, color: stats.openReports > 0 ? 'text-rose-600' : 'text-slate-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-3">
                <h3 className={`text-2xl font-black ${card.valueColor}`}>{card.value}</h3>
                <p className="text-xs text-slate-500 mt-1">{card.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {secondaryCards.map((sec, idx) => {
          const Icon = sec.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200/70 rounded-xl p-3.5 flex items-center justify-between shadow-sm"
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-500">{sec.label}</p>
                <p className={`text-lg font-bold mt-0.5 ${sec.color}`}>{sec.value}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <Icon size={14} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
