import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DocModal } from '../components/DocModal';
import { ShieldCheck, ShieldAlert, CheckCircle2, Eye, Loader2, Phone, Mail, Building } from 'lucide-react';

export const KycReviewView = ({ onUpdateStats }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (!window.confirm('Approve this partner and activate their turf on the platform?')) return;
    try {
      const res = await api.approveVendor(uid);
      if (res.success) {
        alert('✅ Partner & turf approved successfully!');
        setModalData({ isOpen: false, title: '', imageUrl: '', uid: null });
        loadPendingVendors();
        if (onUpdateStats) onUpdateStats();
      }
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (uid) => {
    const reason = window.prompt('Enter rejection reason for vendor feedback:', 'Documents are unclear or invalid. Please re-upload.');
    if (reason === null) return;

    try {
      const res = await api.rejectVendor(uid, reason);
      if (res.success) {
        alert('Partner KYC rejected.');
        setModalData({ isOpen: false, title: '', imageUrl: '', uid: null });
        loadPendingVendors();
        if (onUpdateStats) onUpdateStats();
      }
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
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
            Verify government identity (Aadhaar/PAN) and business utility docs (GST/EB Bill) to activate turfs.
          </p>
        </div>
        <button
          onClick={loadPendingVendors}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition flex items-center space-x-1.5 border border-slate-200"
        >
          {loading ? <Loader2 size={13} className="animate-spin text-emerald-600" /> : null}
          <span>Refresh Queue</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <Loader2 size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs">Loading pending KYC verification submissions...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-sm">
          <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={30} />
          </div>
          <h3 className="text-slate-900 font-extrabold text-base">Verification Queue Clear</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            There are no pending partner KYC or turf applications awaiting verification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((v) => {
            const docs = v.kycDocs || {};
            const uid = v.uid || v.id;

            return (
              <div
                key={uid}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow transition"
              >
                <div className="space-y-4">
                  {/* Partner Overview Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{v.name || 'Partner Name'}</h3>
                      <p className="text-xs font-bold text-emerald-700 flex items-center mt-0.5">
                        <Building size={12} className="mr-1" />
                        <span>{v.businessName || 'Turf Partner'}</span>
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-2">
                        <span className="flex items-center"><Phone size={11} className="mr-1" />{v.phone || 'N/A'}</span>
                        <span className="flex items-center"><Mail size={11} className="mr-1" />{v.email || 'N/A'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono">
                        PAN: <strong className="text-slate-900">{v.panNumber || 'N/A'}</strong> • GST: <strong className="text-slate-900">{v.gstNumber || 'N/A'}</strong>
                      </div>
                    </div>
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                      Pending Review
                    </span>
                  </div>

                  {/* Documents Section */}
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Submitted KYC Documents
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {docs.aadhaarUrl ? (
                        <button
                          type="button"
                          onClick={() => openDoc('Aadhaar Document', docs.aadhaarUrl, uid)}
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

                {/* Approve / Reject Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center space-x-2">
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
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition border border-rose-200 flex items-center space-x-1"
                  >
                    <ShieldAlert size={15} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Inspection Modal */}
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
