import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { VendorInspectionModal } from '../components/VendorInspectionModal';
import { DocModal } from '../components/DocModal';
import {
  ShieldCheck, ShieldAlert, CheckCircle2, Eye, Loader2,
  Phone, Mail, Building, FileSearch, CreditCard, MapPin
} from 'lucide-react';

import { useModal } from '../context/ModalContext';

export const KycReviewView = ({ onUpdateStats }) => {
  const { showAlert, showConfirm } = useModal();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspectVendor, setInspectVendor] = useState(null);
  const [modalData, setModalData] = useState({ isOpen: false, title: '', imageUrl: '', uid: null });

  const loadPendingVendors = async () => {
    setLoading(true);
    try {
      const res = await api.getPendingVendors();
      setVendors(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load pending vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingVendors();
  }, []);

  const handleApprove = async (uid) => {
    const confirmed = await showConfirm({
      title: 'Approve Turf Partner',
      message: 'Are you sure you want to approve this partner and activate their turf facility on the live platform?',
      type: 'success',
      confirmText: 'Approve & Activate',
    });
    if (!confirmed) return;

    try {
      const res = await api.approveVendor(uid);
      if (res.success) {
        await showAlert({
          title: 'Partner Approved!',
          message: 'Partner & turf approved successfully! The vendor now has live home dashboard access.',
          type: 'success',
        });
        setInspectVendor(null);
        setModalData({ isOpen: false, title: '', imageUrl: '', uid: null });
        loadPendingVendors();
        if (onUpdateStats) onUpdateStats();
      }
    } catch (err) {
      showAlert({
        title: 'Approval Failed',
        message: err.message || 'Could not approve partner.',
        type: 'error',
      });
    }
  };

  const handleReject = async (uid) => {
    const confirmed = await showConfirm({
      title: 'Reject KYC Application',
      message: 'Are you sure you want to reject this vendor application? The vendor will be notified to re-upload clear documents.',
      type: 'danger',
      confirmText: 'Confirm Rejection',
    });
    if (!confirmed) return;

    try {
      const res = await api.rejectVendor(uid, 'Documents are unclear or invalid. Please re-upload clear photos.');
      if (res.success) {
        await showAlert({
          title: 'Application Rejected',
          message: 'Partner KYC application rejected. Status updated.',
          type: 'info',
        });
        setInspectVendor(null);
        setModalData({ isOpen: false, title: '', imageUrl: '', uid: null });
        loadPendingVendors();
        if (onUpdateStats) onUpdateStats();
      }
    } catch (err) {
      showAlert({
        title: 'Rejection Failed',
        message: err.message || 'Could not reject partner application.',
        type: 'error',
      });
    }
  };

  const openDoc = (title, imageUrl, uid) => {
    setModalData({
      isOpen: true,
      title,
      imageUrl,
      uid,
    });
  };

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Partner KYC & Turf Review Desk</h2>
          <p className="text-xs text-slate-500">
            Inspect partner identity, business certificates, facility photos, and registration payments before granting platform access.
          </p>
        </div>
        <button
          onClick={loadPendingVendors}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl text-slate-700 transition flex items-center space-x-1.5 border border-slate-200"
        >
          {loading ? <Loader2 size={13} className="animate-spin text-emerald-600" /> : null}
          <span>Refresh Queue ({vendors.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 bg-white border border-slate-200 rounded-3xl">
          <Loader2 size={26} className="animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs font-semibold">Loading pending partner submissions & document attachments...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={30} />
          </div>
          <h3 className="text-slate-900 font-extrabold text-base">Verification Queue Clear</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            All submitted partner applications have been reviewed. New submissions will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((v) => {
            const docs = v.kycDocs || {};
            const turf = v.turf || {};
            const sub = v.subscription || {};
            const uid = v.uid || v.id;

            return (
              <div
                key={uid}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition"
              >
                <div className="space-y-4">
                  {/* Partner Overview Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{v.businessName || v.turfName || 'Turf Partner'}</h3>
                      <p className="text-xs font-bold text-slate-600 flex items-center mt-0.5">
                        <Building size={12} className="mr-1 text-slate-400" />
                        <span>Owner: {v.name || 'N/A'}</span>
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-2">
                        <span className="flex items-center"><Phone size={11} className="mr-1 text-slate-400" />{v.phone || 'N/A'}</span>
                        <span className="flex items-center"><Mail size={11} className="mr-1 text-slate-400" />{v.email || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                        Pending Review
                      </span>
                      {v.hasPaidSubscription || sub.active ? (
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border border-emerald-200 flex items-center">
                          <CreditCard size={9} className="mr-1" />
                          Plan Paid
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Linked Turf Quick Info */}
                  {turf && turf.name ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin size={14} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900">{turf.name}</p>
                          <p className="text-[11px] text-slate-500">{turf.location?.city || turf.address || 'Facility'}</p>
                        </div>
                      </div>
                      <span className="font-extrabold text-slate-800">₹{turf.pricing?.baseRate || turf.pricePerHour || 800}/hr</span>
                    </div>
                  ) : null}

                  {/* Documents Section */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Submitted KYC Documents
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        PAN: {v.panNumber || '—'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {docs.aadhaarUrl ? (
                        <button
                          type="button"
                          onClick={() => openDoc('Aadhaar Card Document', docs.aadhaarUrl, uid)}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left flex items-center justify-between text-slate-800 transition"
                        >
                          <span className="truncate font-semibold text-[11px]">Aadhaar Card</span>
                          <Eye size={13} className="text-slate-400" />
                        </button>
                      ) : (
                        <span className="p-2.5 bg-slate-50 text-slate-400 rounded-xl text-[11px]">No Aadhaar</span>
                      )}

                      {docs.panUrl ? (
                        <button
                          type="button"
                          onClick={() => openDoc('PAN Card Document', docs.panUrl, uid)}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left flex items-center justify-between text-slate-800 transition"
                        >
                          <span className="truncate font-semibold text-[11px]">PAN Card</span>
                          <Eye size={13} className="text-slate-400" />
                        </button>
                      ) : (
                        <span className="p-2.5 bg-slate-50 text-slate-400 rounded-xl text-[11px]">No PAN</span>
                      )}

                      {docs.gstUrl ? (
                        <button
                          type="button"
                          onClick={() => openDoc('GST Certificate', docs.gstUrl, uid)}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left flex items-center justify-between text-slate-800 transition"
                        >
                          <span className="truncate font-semibold text-[11px]">GST Certificate</span>
                          <Eye size={13} className="text-slate-400" />
                        </button>
                      ) : (
                        <span className="p-2.5 bg-slate-50 text-slate-400 rounded-xl text-[11px]">No GST</span>
                      )}

                      {docs.ebBillUrl ? (
                        <button
                          type="button"
                          onClick={() => openDoc('Electricity / Utility Bill', docs.ebBillUrl, uid)}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left flex items-center justify-between text-slate-800 transition"
                        >
                          <span className="truncate font-semibold text-[11px]">EB Utility Bill</span>
                          <Eye size={13} className="text-slate-400" />
                        </button>
                      ) : (
                        <span className="p-2.5 bg-slate-50 text-slate-400 rounded-xl text-[11px]">No EB Bill</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Approve / Inspect / Reject Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setInspectVendor(v)}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center space-x-1"
                  >
                    <FileSearch size={14} />
                    <span>Inspect</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(uid)}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition shadow-sm shadow-emerald-500/20 flex items-center justify-center space-x-1.5"
                  >
                    <ShieldCheck size={15} />
                    <span>Approve Partner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(uid)}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition border border-rose-200 flex items-center space-x-1"
                  >
                    <ShieldAlert size={14} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Partner Profile & Attachment Inspection Modal */}
      <VendorInspectionModal
        isOpen={!!inspectVendor}
        vendor={inspectVendor}
        onClose={() => setInspectVendor(null)}
        onApprove={(uid) => handleApprove(uid)}
        onReject={(uid) => handleReject(uid)}
      />

      {/* Single Document Inspection Modal */}
      <DocModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData({ isOpen: false, title: '', imageUrl: '', uid: null })}
        title={modalData.title}
        imageUrl={modalData.imageUrl}
        onApprove={modalData.uid ? () => handleApprove(modalData.uid) : null}
        onReject={modalData.uid ? () => handleReject(modalData.uid) : null}
      />
    </div>
  );
};
