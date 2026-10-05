import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  CheckCircle2,
  Loader2,
  Phone,
  MapPin,
  User,
  Building,
  MessageSquare,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

export const ReportsView = ({ onUpdateStats }) => {
  const { showAlert, showConfirm } = useModal();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'open', 'resolved'

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.getAllReports();
      const rawList = res.data?.items || [];
      const seenIds = new Set();
      const unique = [];
      for (const item of rawList) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          unique.push(item);
        }
      }
      setReports(unique);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleResolve = async (reportId, isEnquiry = false) => {
    const actionLabel = isEnquiry ? 'Mark Enquiry as Contacted & Resolved' : 'Resolve Support Report';
    const confirmed = await showConfirm({
      title: actionLabel,
      message: isEnquiry
        ? 'Confirm that you have reviewed this prospective partner enquiry and contacted the vendor?'
        : 'Mark this issue as reviewed and resolved by Super Admin?',
      type: 'info',
      confirmText: 'Confirm & Resolve',
    });
    if (!confirmed) return;

    try {
      const note = isEnquiry
        ? 'Prospective vendor contacted and enquiry resolved by Super Admin.'
        : 'Issue reviewed and resolved by Super Admin.';
      const res = await api.resolveReport(reportId, note);
      if (res.success) {
        await showAlert({
          title: 'Status Updated',
          message: isEnquiry ? 'Vendor enquiry marked as resolved.' : 'Partner report resolved successfully.',
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

  const filteredReports = reports.filter((r) => {
    if (activeFilter === 'open') return r.status !== 'resolved';
    if (activeFilter === 'resolved') return r.status === 'resolved';
    return true;
  });

  const openCount = reports.filter((r) => r.status !== 'resolved').length;
  const enquiryCount = reports.filter(
    (r) => r.category === 'Vendor Enquiry' || r.issueType === 'Vendor Enquiry' || r.contactInfo
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-extrabold text-slate-900">Partner Support & Vendor Enquiries</h2>
            {openCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700">
                {openCount} Open
              </span>
            )}
            {enquiryCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-700">
                {enquiryCount} Enquiries
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Prospective vendor registration leads and partner technical complaints.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Filter Pills */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({reports.length})
            </button>
            <button
              onClick={() => setActiveFilter('open')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeFilter === 'open' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setActiveFilter('resolved')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                activeFilter === 'resolved' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resolved ({reports.length - openCount})
            </button>
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
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <Loader2 size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs">Loading issue reports & vendor enquiries...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
          <h3 className="text-slate-900 font-extrabold text-base">No Reports Found</h3>
          <p className="text-slate-500 text-xs mt-1">
            {activeFilter === 'open'
              ? 'All enquiries and support tickets have been resolved!'
              : 'No partner tickets or vendor enquiries found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((r) => {
            const isEnquiry =
              r.category === 'Vendor Enquiry' || r.issueType === 'Vendor Enquiry' || !!r.contactInfo;
            const contact = r.contactInfo || {};
            const vendorObj = r.vendor || {};
            const createdDate = r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A';

            return (
              <div
                key={r.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between gap-4 ${
                  isEnquiry ? 'border-emerald-200/90' : 'border-slate-200/80'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Category, Status, Created Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${
                          isEnquiry
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {isEnquiry ? 'Vendor Enquiry' : r.category || r.issueType || 'General Issue'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {r.status || 'open'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                      <Clock size={12} />
                      <span>{createdDate}</span>
                    </div>
                  </div>

                  {/* Enquiry Contact Details Banner if available */}
                  {isEnquiry && (contact.turfName || contact.vendorName || contact.vendorMobile) && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      {contact.turfName && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <Building size={14} className="text-emerald-600 shrink-0" />
                          <span className="truncate">
                            <strong className="text-slate-900">Turf:</strong> {contact.turfName}
                          </span>
                        </div>
                      )}
                      {contact.vendorName && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <User size={14} className="text-emerald-600 shrink-0" />
                          <span className="truncate">
                            <strong className="text-slate-900">Owner:</strong> {contact.vendorName}
                          </span>
                        </div>
                      )}
                      {contact.vendorMobile && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <Phone size={14} className="text-emerald-600 shrink-0" />
                          <a
                            href={`tel:${contact.vendorMobile}`}
                            className="font-bold text-emerald-600 hover:underline"
                          >
                            {contact.vendorMobile}
                          </a>
                        </div>
                      )}
                      {contact.vendorLocation && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <MapPin size={14} className="text-emerald-600 shrink-0" />
                          <span className="truncate">{contact.vendorLocation}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Logged in vendor info if available */}
                  {!isEnquiry && vendorObj.name && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <div className="flex items-center space-x-1.5">
                        <User size={13} className="text-indigo-600" />
                        <span className="font-bold text-slate-800">{vendorObj.name}</span>
                      </div>
                      {vendorObj.email && <span className="text-slate-500">{vendorObj.email}</span>}
                      {vendorObj.phone && (
                        <a href={`tel:${vendorObj.phone}`} className="font-semibold text-emerald-600">
                          {vendorObj.phone}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Description / Message Body */}
                  <div className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed bg-white border border-slate-100 rounded-xl p-3">
                    {r.description}
                  </div>

                  {/* Resolution Note if resolved */}
                  {r.resolutionNote && (
                    <div className="text-xs bg-emerald-50/80 border border-emerald-200/60 rounded-xl px-3 py-2 text-emerald-800 flex items-start space-x-2">
                      <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold">Resolution Note: </span>
                        <span>{r.resolutionNote}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  {r.status !== 'resolved' ? (
                    <button
                      type="button"
                      onClick={() => handleResolve(r.id, isEnquiry)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0 transition shadow-sm flex items-center space-x-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>{isEnquiry ? 'Mark Contacted & Resolved' : 'Mark Resolved'}</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 font-bold flex items-center space-x-1 shrink-0">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Resolved</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
