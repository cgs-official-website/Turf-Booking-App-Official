import React, { useState, useEffect } from 'react';
import { CheckCircle2, ArrowRight, Sparkles, Shield } from 'lucide-react';
import { api } from '../../../api/client';
import { PlanDetailsModal } from './PlanDetailsModal';

export const Pricing = ({ onSelectPlan }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState(null);

  const fetchPlans = async () => {
    try {
      const res = await api.getSubscriptionPlans();
      if (res?.success && res?.data?.plans && Array.isArray(res.data.plans)) {
        const sorted = [...res.data.plans].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        setPlans(sorted);
      } else if (Array.isArray(res?.data)) {
        const sorted = [...res.data].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        setPlans(sorted);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error('Failed to load subscription plans from database:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <section id="pricing" className="scroll-mt-16 py-16 lg:py-24 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
            Vendor Subscriptions
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Flexible Plans Built for Growing Sports Arenas
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal">
            Transparent, scalable subscriptions for single-pitch turfs and multi-sport complexes. Managed live with automatic activation.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-8">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              No subscription plans configured in the database currently.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan) => {
              const isPopular = !!plan.popular;
              const isFree = Number(plan.price) === 0;
              const billingCycle =
                plan.durationDays === 365 ? 'per year' : plan.durationDays === 90 ? 'per 3 months' : 'per month';

              return (
                <div
                  key={plan.id || plan._id || plan.name}
                  onClick={() => setSelectedPlanForModal(plan)}
                  className={`relative bg-white dark:bg-slate-900 border rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 cursor-pointer ${
                    isPopular
                      ? 'border-emerald-500 dark:border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                      : 'border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-emerald-500/20">
                      <span>Most Popular</span>
                    </div>
                  )}

                  <div>
                    {/* Plan Header */}
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px] line-clamp-2 font-normal">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="pb-5 mb-5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline space-x-1">
                        {isFree ? (
                          <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            Free
                          </span>
                        ) : (
                          <>
                            <span className="text-base font-semibold text-slate-600 dark:text-slate-400">₹</span>
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                              {Number(plan.price).toLocaleString('en-IN')}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                          / {billingCycle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        {plan.durationDays ? `${plan.durationDays} days access validity` : 'Standard validity'}
                      </p>
                    </div>

                    {/* Included Features */}
                    <div className="space-y-2.5 mb-6">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Included Features
                      </p>
                      <ul className="space-y-2">
                        {(plan.features || []).map((feat, idx) => (
                          <li key={idx} className="flex items-start text-xs text-slate-600 dark:text-slate-300 font-normal">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5 mr-2" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Plan CTA */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanForModal(plan);
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                        isPopular
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span>{isFree ? 'View Free Plan Details' : 'Choose Plan Details'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for Details */}
        <PlanDetailsModal
          isOpen={!!selectedPlanForModal}
          plan={selectedPlanForModal}
          onClose={() => setSelectedPlanForModal(null)}
          onSelectPlan={(p) => {
            if (onSelectPlan) onSelectPlan(p);
          }}
        />

      </div>
    </section>
  );
};
