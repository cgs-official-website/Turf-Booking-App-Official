import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Building2,
  CalendarCheck,
  Users,
  UserCheck,
  Trophy,
  Star,
  AlertTriangle,
  Inbox,
  Globe,
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
  pendingInquiriesCount = 0,
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
        { id: 'landing', label: 'Landing Page', icon: Globe },
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
      title: 'COMMUNITY & FEEDBACK',
      items: [
        { id: 'reviews', label: 'Turf Reviews', icon: Star },
        { id: 'users', label: 'Players Directory', icon: Users },
        { id: 'matches', label: 'Matches & Scores', icon: Trophy },
      ],
    },
    {
      title: 'SUPPORT & LEADS',
      items: [
        {
          id: 'inquiries',
          label: 'Inquiries & Leads',
          icon: Inbox,
          badge: pendingInquiriesCount,
          badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        },
        {
          id: 'reports',
          label: 'Issue Reports',
          icon: AlertTriangle,
          badge: openReportsCount,
          badgeColor: 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
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
        className={`fixed lg:sticky top-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col h-screen shadow-[4px_0_24px_rgba(0,0,0,0.02)] select-none z-50 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header with Close Button for Mobile */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
              <h1 className="font-black text-slate-900 dark:text-white text-[15px] tracking-tight leading-none">
                Namma Ooru <span className="text-emerald-600 dark:text-emerald-400 font-black">Turf</span>
              </h1>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase block mt-1">
                Super Admin
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden transition cursor-pointer"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 font-bold scale-[1.01]'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:pl-3.5'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
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
                              : item.badgeColor || 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
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
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 ring-2 ring-emerald-50 dark:ring-emerald-950">
                AD
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">Super Admin</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{admin?.email || 'admin@zuna.com'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition shrink-0 ml-1 cursor-pointer"
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
