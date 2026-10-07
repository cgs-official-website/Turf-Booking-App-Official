import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { VendorInspectionModal } from '../components/VendorInspectionModal';
import {
  Search,
  Phone,
  Mail,
  Loader2,
  FileSearch,
  CheckCircle2,
  RotateCw,
  Building2,
  Clock,
  ShieldCheck,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { ExportMenu } from '../components/ExportMenu';
import { exportToCSV, exportToExcel, formatVendorRecord } from '../utils/exportUtils';

export const VendorsView = () => {
  const { showAlert, showConfirm } = useModal();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [inspectVendor, setInspectVendor] = useState(null);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const res = await api.getAllVendors(null, null, 500);
      setVendors(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleApprove = async (uid) => {
    const confirmed = await showConfirm({
      title: 'Approve Partner Facility',
      message: 'Approve this partner and activate their turf facility on the platform?',
      type: 'success',
      confirmText: 'Approve Partner',
    });
    if (!confirmed) return;

    try {
      const res = await api.approveVendor(uid);
      if (res.success) {
        await showAlert({
          title: 'Partner Approved!',
          message: 'Partner and turf facility approved successfully!',
          type: 'success',
        });
        setInspectVendor(null);
        loadVendors();
      }
    } catch (err) {
      showAlert({
        title: 'Approval Error',
        message: err.message || 'Could not approve partner.',
        type: 'error',
      });
    }
  };

  const handleReject = async (uid) => {
    const confirmed = await showConfirm({
      title: 'Reject Partner KYC',
      message: 'Reject this vendor application? The vendor will be notified to re-upload documents.',
      type: 'danger',
      confirmText: 'Confirm Rejection',
    });
    if (!confirmed) return;

    try {
      const res = await api.rejectVendor(uid, 'Documents are unclear or invalid.');
      if (res.success) {
        await showAlert({
          title: 'KYC Rejected',
          message: 'Partner KYC rejected.',
          type: 'info',
        });
        setInspectVendor(null);
        loadVendors();
      }
    } catch (err) {
      showAlert({
        title: 'Rejection Error',
        message: err.message || 'Could not reject partner.',
        type: 'error',
      });
    }
  };

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      // Status filter
      if (statusFilter !== 'all') {
        const kyc = (v.kycStatus || 'pending').toLowerCase();
        if (kyc !== statusFilter.toLowerCase()) return false;
      }
      // Search
      if (q) {
        const matchesQuery =
          (v.name || '').toLowerCase().includes(q) ||
          (v.businessName || '').toLowerCase().includes(q) ||
          (v.email || '').toLowerCase().includes(q) ||
          (v.phone || '').toLowerCase().includes(q) ||
          (v.turfName || v.turf?.name || '').toLowerCase().includes(q) ||
          (v.uid || v.id || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [vendors, search, statusFilter]);

  // KPI Metrics
  const metrics = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let paid = 0;
    vendors.forEach((v) => {
      const kyc = (v.kycStatus || 'pending').toLowerCase();
      if (kyc === 'approved') approved++;
      if (kyc === 'pending') pending++;
      if (v.hasPaidSubscription || v.subscription?.active) paid++;
    });
    return { approved, pending, paid, total: vendors.length };
  }, [vendors]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredVendors.length === 0) {
      alert('No vendor registration records to export.');
      return;
    }
    const formatted = filteredVendors.map(formatVendorRecord);
    const dateStamp = new Date().toISOString().slice(0, 10);
    exportToCSV(formatted, `vendor_registration_records_${dateStamp}.csv`);
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredVendors.length === 0) {
      alert('No vendor registration records to export.');
      return;
    }
    const formatted = filteredVendors.map(formatVendorRecord);
    const dateStamp = new Date().toISOString().slice(0, 10);
    exportToExcel(formatted, `vendor_registration_records_${dateStamp}.xlsx`, 'Vendor Records');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <UserCheck size={20} className="text-emerald-600" />
            <span>Registered Turf Partners & Facility Managers</span>
          </h2>
          <p className="text-xs text-slate-500">
            All registered turf vendors, KYC submission logs, subscriptions, and facility records.
          </p>
        </div>

        {/* Action Controls: Export & Refresh */}
        <div className="flex items-center gap-2">
          <ExportMenu
            label="Download Vendor Records"
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            count={filteredVendors.length}
            disabled={loading || filteredVendors.length === 0}
          />

          <button
            onClick={loadVendors}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 shadow-sm transition"
            title="Refresh vendors"
          >
            <RotateCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Partners</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">{metrics.total}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">KYC Approved</span>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{metrics.approved}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending KYC</span>
          <div className="text-xl font-black text-amber-600 mt-0.5">{metrics.pending}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Paid Subscriptions</span>
          <div className="text-xl font-black text-blue-600 mt-0.5">{metrics.paid}</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search partner name, business, email, turf..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All KYC Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="text-xs text-red-600 hover:underline font-bold px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs min-w-[750px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">Partner Name</th>
              <th className="p-3.5">Business Entity</th>
              <th className="p-3.5">Contact (Phone/Email)</th>
              <th className="p-3.5">Linked Turf</th>
              <th className="p-3.5">KYC Status</th>
              <th className="p-3.5">Subscription</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="p-10 text-center text-slate-400">
                  <Loader2 size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Loading partners...</span>
                </td>
              </tr>
            ) : filteredVendors.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-10 text-center text-slate-400">
                  No partners found matching your search.
                </td>
              </tr>
            ) : (
              filteredVendors.map((v) => (
                <tr key={v.uid || v.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-bold text-slate-900 text-xs">
                    {v.name || 'Turf Partner'}
                    {v.createdAt && (
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Joined: {new Date(v.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-700 font-semibold">{v.businessName || 'N/A'}</td>
                  <td className="p-3.5 text-slate-600">
                    <p className="flex items-center">
                      <Phone size={11} className="mr-1 text-slate-400" />
                      {v.phone || 'N/A'}
                    </p>
                    <p className="flex items-center text-[11px] text-slate-500 mt-0.5">
                      <Mail size={11} className="mr-1 text-slate-400" />
                      {v.email || 'N/A'}
                    </p>
                  </td>
                  <td className="p-3.5 text-emerald-700 font-semibold">
                    {v.turfName || v.turf?.name || 'No Turf Linked'}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        v.kycStatus === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : v.kycStatus === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {v.kycStatus || 'pending'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {v.hasPaidSubscription || v.subscription?.active ? (
                      <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Paid ({v.subscription?.planName || v.subscription?.planId || 'Plan'})
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium">Inactive</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setInspectVendor(v)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition inline-flex items-center space-x-1"
                    >
                      <FileSearch size={13} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Full Partner Profile & Attachment Inspection Modal */}
      <VendorInspectionModal
        isOpen={!!inspectVendor}
        vendor={inspectVendor}
        onClose={() => setInspectVendor(null)}
        onApprove={(uid) => handleApprove(uid)}
        onReject={(uid) => handleReject(uid)}
      />
    </div>
  );
};
