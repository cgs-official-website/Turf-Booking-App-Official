import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { useModal } from '../context/ModalContext';

export const ReportsView = ({ onUpdateStats }) => {
  const { showAlert, showConfirm } = useModal();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.getAllReports();
      setReports(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleResolve = async (reportId) => {
    const confirmed = await showConfirm({
      title: 'Resolve Support Report',
      message: 'Mark this issue as reviewed and resolved by Super Admin?',
      type: 'info',
      confirmText: 'Resolve Issue',
    });
    if (!confirmed) return;

    try {
      const res = await api.resolveReport(reportId, 'Issue reviewed and resolved by Super Admin.');
      if (res.success) {
        await showAlert({
          title: 'Report Resolved',
          message: 'Partner report resolved successfully.',
          type: 'success',
        });
        loadReports();
        if (onUpdateStats) onUpdateStats();
      }
    } catch (err) {
      showAlert({
        title: 'Action Failed',
        message: err.message || 'Could not resolve report.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Partner Issue & Support Reports</h2>
          <p className="text-xs text-slate-500">Technical or facility complaints submitted from the vendor app.</p>
        </div>
        <button
          onClick={loadReports}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition flex items-center space-x-1.5 border border-slate-200"
        >
          {loading ? <Loader2 size={13} className="animate-spin text-emerald-600" /> : null}
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <Loader2 size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs">Loading issue reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
          <h3 className="text-slate-900 font-extrabold text-base">No Open Issues</h3>
          <p className="text-slate-500 text-xs mt-1">No partner or player issue tickets have been submitted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow transition"
            >
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2.5">
                  <span className="font-bold text-slate-900 text-sm">{r.category || 'General Issue'}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      r.status === 'resolved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {r.status || 'open'}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium">{r.description}</p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Submitted by Vendor UID: <span className="text-slate-700">{r.vendorId || 'N/A'}</span>
                </div>
                {r.resolutionNote && (
                  <p className="text-xs text-emerald-700 mt-1 font-semibold">
                    <strong>Resolution:</strong> {r.resolutionNote}
                  </p>
                )}
              </div>

              {r.status !== 'resolved' ? (
                <button
                  type="button"
                  onClick={() => handleResolve(r.id)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shrink-0 transition shadow-sm"
                >
                  Mark Resolved
                </button>
              ) : (
                <span className="text-xs text-slate-500 font-bold flex items-center space-x-1 shrink-0">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Resolved</span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
