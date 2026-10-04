import React, { useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  MessageCircle,
  Smartphone,
  CreditCard,
  Building2,
  Check,
} from 'lucide-react';

export const PlanDetailsModal = ({ isOpen, plan, onClose, onSelectPlan }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !plan) return null;

  const isFree = Number(plan.price) === 0 || String(plan.price).toLowerCase() === 'free';
  const isCustom = String(plan.price).toLowerCase() === 'custom';
  const isPopular = !!plan.popular;
  const billingCycle =
    plan.durationDays === 365
      ? 'per year'
      : plan.durationDays === 90
      ? 'per 3 months'
      : 'per month';

  const formattedPrice = isFree
    ? 'Free'
    : isCustom
    ? 'Custom'
    : `₹${Number(plan.price).toLocaleString('en-IN')}`;

  const validityText = plan.durationDays
    ? `${plan.durationDays} Days Access Validity`
    : 'Standard Validity';

  const defaultPerks = [
    {
      title: 'Full Slot Control',
      desc: 'Lock slots atomically, configure recurring batches, set peak weekend rates.',
      icon: Clock,
    },
    {
      title: 'Razorpay Instant Escrow',
      desc: 'Automated 100% digital player payments settled directly to vendor bank accounts.',
      icon: CreditCard,
    },
    {
      title: 'Live Mobile App Listing',
      desc: 'Featured discovery on Android & iOS mobile apps for players across your city.',
      icon: Smartphone,
    },
    {
      title: 'Verified Partner Badge',
      desc: 'Boost player trust with government KYC approval and official venue badge.',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          {isPopular && (
            <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white mb-2 shadow-xs">
              Recommended Choice
            </span>
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {plan.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                {plan.description || 'Full-featured tier designed for professional turf facility managers.'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {formattedPrice}
            </span>
            {!isCustom && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                / {billingCycle} ({validityText})
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-200">
          
          {/* Features List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Included in this Package
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(plan.features || []).map((feat, idx) => (
                <div key={idx} className="flex items-start text-xs sm:text-sm font-medium">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5 mr-2" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Ecosystem Advantages */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Standard Architecture Guarantees
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {defaultPerks.map((perk, i) => {
                const Icon = perk.icon;
                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 flex items-start gap-3"
                  >
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-100 dark:border-slate-700">
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{perk.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{perk.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
            Instant activation upon payment completion.
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onSelectPlan) onSelectPlan(plan);
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-1.5"
            >
              <span>{isFree ? 'Get Started Free' : 'Choose This Plan'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
