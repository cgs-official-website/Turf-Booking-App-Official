import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Building2,
  CalendarCheck,
  Users,
  UserCheck,
  Trophy,
  AlertTriangle,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import appLogoSm from '../assets/logosm.png';

export const Sidebar = ({
  activeTab,
  onSelectTab,
  pendingKycCount = 0,
  openReportsCount = 0,
  isOpen = false,
  onClose,
}) => {
  const { admin, logout } = useAuth();

  const sections = [
    {
      title: 'MAIN',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'bookings', label: 'Live Bookings', icon: CalendarCheck },
      ],
    },
    {
      title: 'PARTNERS & FACILITIES',
      items: [
        { id: 'kyc', label: 'KYC & Approvals', icon: ShieldCheck, badge: pendingKycCount },
        { id: 'turfs', label: 'All Turfs', icon: Building2 },
        { id: 'vendors', label: 'Turf Partners', icon: UserCheck },
        { id: 'subscriptions', label: 'Partner Plans', icon: Trophy },
      ],
    },
    {
      title: 'COMMUNITY & GAMES',
      items: [
        { id: 'users', label: 'Players Directory', icon: Users },
        { id: 'matches', label: 'Matches & Scores', icon: Trophy },
      ],
    },
    {
      title: 'SUPPORT & LOGS',
      items: [
        {
          id: 'reports',
          label: 'Issue Reports',
          icon: AlertTriangle,
          badge: openReportsCount,
          badgeColor: 'bg-rose-50 text-rose-600 border border-rose-200',
        },
      ],
    },
  ];

  const handleTabClick = (tabId) => {
    onSelectTab(tabId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed lg:sticky top-0 left-0 w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] select-none z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header with Close Button for Mobile */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={appLogoSm}
              alt="Namma Ooru Turf Logo"
              className="w-10 h-10 object-contain rounded-xl shadow-xs"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div>
              <h1 className="font-black text-slate-900 text-[15px] tracking-tight leading-none">
                Namma Ooru <span className="text-emerald-600 font-black">Turf</span>
              </h1>
              <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full inline-block mt-1 tracking-wider uppercase">
                Super Admin
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden transition"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Operational Status Capsule */}
        <div className="px-4 pt-3.5 pb-2">
          <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 border border-emerald-100/80 px-3 py-2 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-800 font-bold text-[11px] tracking-tight">Live Platform</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-100 shadow-2xs">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 font-bold scale-[1.01]'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:pl-3.5'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'
                          }`}
                        >
                          <Icon size={14} className={isActive ? 'text-white' : ''} />
                        </div>
                        <span className="tracking-tight">{item.label}</span>
                      </div>

                      {item.badge > 0 ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-2xs ${
                            isActive
                              ? 'bg-white text-emerald-700'
                              : item.badgeColor || 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : isActive ? (
                        <ChevronRight size={13} className="text-white/70" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Admin Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 ring-2 ring-emerald-50">
                AD
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-extrabold text-slate-900 truncate">Super Admin</p>
                <p className="text-[10px] text-slate-500 truncate">{admin?.email || 'admin@zuna.com'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 ml-1"
              title="Logout"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
