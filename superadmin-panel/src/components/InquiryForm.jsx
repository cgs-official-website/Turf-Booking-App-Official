import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, X, MessageSquare } from 'lucide-react';
import { api } from '../api/client';

export const InquiryForm = ({ sourcePage = 'Landing Page', initialModule = 'General' }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    userType: 'Player',
    module: initialModule,
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || (!formData.email.trim() && !formData.phone.trim())) {
      setStatus({ type: 'error', message: 'Please provide your name and either an email or phone number.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await api.submitInquiry({
        ...formData,
        sourcePage,
        submittedAt: new Date().toISOString(),
      });

      if (res && (res.success || res.data)) {
        setStatus({
          type: 'success',
          message:
            res.data?.message ||
            'Thank you! Your inquiry has been received. Our operations team will contact you shortly.',
        });
        setFormData({
          name: '',
          email: '',
          phone: '',
          userType: 'Player',
          module: initialModule,
          message: '',
        });
      } else {
        setStatus({
          type: 'error',
          message: res?.error?.message || 'Unable to send message right now. Please try again.',
        });
      }
    } catch (err) {
      console.error('Inquiry submission error:', err);
      setStatus({
        type: 'error',
        message: err.message || 'Unable to submit inquiry. Please check your internet or try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
      {status.type === 'success' ? (
        <div className="text-center py-8 space-y-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700 shadow-xs">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Inquiry Received</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">{status.message}</p>
          <button
            type="button"
            onClick={() => setStatus({ type: '', message: '' })}
            className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Send Another Inquiry
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {status.type === 'error' && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{status.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g. John Doe"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                User Role
              </label>
              <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              >
                <option value="Player">Player / Athlete</option>
                <option value="Vendor">Turf Owner / Facility Partner</option>
                <option value="Corporate">Corporate / Tournament Organizer</option>
                <option value="Franchise">Franchise Enterprise</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@domain.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Message or Requirements
            </label>
            <textarea
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us about your turf facility, booking requirements, or inquiries..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <Send size={14} />
            <span>{loading ? 'Submitting Inquiry...' : 'Submit Inquiry'}</span>
          </button>
        </form>
      )}
    </div>
  );
};

export const InquiryModal = ({ isOpen, onClose, sourcePage = 'Landing Page Modal' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Submit Inquiries</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct desk response in &lt; 2 hours</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <InquiryForm sourcePage={sourcePage} />
        </div>
      </div>
    </div>
  );
};
