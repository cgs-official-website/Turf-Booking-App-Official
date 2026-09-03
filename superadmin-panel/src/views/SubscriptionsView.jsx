import React, { useState, useEffect } from 'react';
import {
  Zap, Plus, Edit2, Trash2, CheckCircle2, Star,
  DollarSign, RefreshCw, AlertCircle, Clock, ShieldCheck
} from 'lucide-react';
import { api } from '../api/client';
import { useModal } from '../context/ModalContext';

export const SubscriptionsView = () => {
  const { showAlert, showConfirm } = useModal();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    durationDays: 30,
    description: '',
    featuresText: '',
    popular: false,
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.getSubscriptionPlans();
      if (res.success && res.data?.plans) {
        setPlans(res.data.plans);
      } else if (Array.isArray(res.data)) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: '',
      durationDays: 30,
      description: '',
      featuresText: '',
      popular: false,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || '',
      price: plan.price || '',
      durationDays: plan.durationDays || 30,
      description: plan.description || '',
      featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      popular: !!plan.popular,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      showAlert({
        title: 'Validation Missing',
        message: 'Please fill out the plan name and price before saving.',
        type: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        price: Number(formData.price),
        durationDays: Number(formData.durationDays || 30),
        description: formData.description.trim(),
        features: formData.featuresText.split('\n').map((s) => s.trim()).filter(Boolean),
        popular: formData.popular,
      };

      if (editingPlan) {
        const id = editingPlan.id || editingPlan._id;
        await api.updateSubscriptionPlan(id, payload);
      } else {
        await api.createSubscriptionPlan(payload);
      }

      setModalOpen(false);
      await showAlert({
        title: 'Plan Saved!',
        message: `Plan "${payload.name}" has been ${editingPlan ? 'updated' : 'created'} successfully!`,
        type: 'success',
      });
      fetchPlans();
    } catch (err) {
      showAlert({
        title: 'Save Failed',
        message: err.message || 'Failed to save subscription plan.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    const id = plan.id || plan._id;
    const confirmed = await showConfirm({
      title: 'Delete Subscription Plan',
      message: `Are you sure you want to delete "${plan.name}"? Vendors will no longer see this plan.`,
      type: 'danger',
      confirmText: 'Delete Plan',
    });
    if (!confirmed) return;

    try {
      await api.deleteSubscriptionPlan(id);
      await showAlert({
        title: 'Plan Deleted',
        message: `Plan "${plan.name}" was removed.`,
        type: 'info',
      });
      fetchPlans();
    } catch (err) {
      showAlert({
        title: 'Delete Failed',
        message: err.message || 'Could not delete plan.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Zap size={20} />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Dynamic Subscription Plans</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Update pricing, duration, and features in real-time. Changes immediately sync to the Turf Partner Mobile App.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={fetchPlans}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
            title="Refresh plans"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Plus size={16} />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-3 text-rose-700 text-xs font-semibold">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Plans Grid */}
      {loading && !plans.length ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-emerald-500" />
          <p className="text-xs font-medium">Fetching real-time subscription tiers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPopular = plan.popular;
            return (
              <div
                key={plan.id || plan._id}
                className={`relative flex flex-col justify-between bg-white rounded-2xl border p-6 transition-all duration-200 shadow-xs hover:shadow-md ${
                  isPopular
                    ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-xs">
                    <Star size={11} className="fill-white" />
                    <span>Recommended Tier</span>
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-4 flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-emerald-600">₹{plan.price}</span>
                    <span className="text-xs font-bold text-slate-500">
                      / {plan.durationDays >= 365 ? '1 Year' : `${plan.durationDays || 30} Days`}
                    </span>
                  </div>

                  {/* Features */}
                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Included Features</p>
                    {(plan.features || []).map((feat, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs font-medium text-slate-700">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleOpenEdit(plan)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                  >
                    <Edit2 size={13} />
                    <span>Edit Tier</span>
                  </button>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Modal (Add / Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {editingPlan ? `Edit "${editingPlan.name}"` : 'Create Partner Membership Plan'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Set the price and features that partner vendors will receive when subscribing.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plan Title</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Pro Growth Partner"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="999"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Days)</label>
                  <select
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="30">30 Days (Monthly)</option>
                    <option value="90">90 Days (Quarterly)</option>
                    <option value="180">180 Days (Half-Year)</option>
                    <option value="365">365 Days (Annual)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Short Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Ideal for multi-pitch arenas & priority ranking"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Features (One per line)
                </label>
                <textarea
                  rows={4}
                  value={formData.featuresText}
                  onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                  placeholder="Multiple Turfs Management&#10;Dynamic Peak Pricing&#10;Verified Partner Badge"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="popularCheck"
                  checked={formData.popular}
                  onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="popularCheck" className="text-xs font-bold text-slate-700">
                  Mark as "Recommended Partner" tier
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
