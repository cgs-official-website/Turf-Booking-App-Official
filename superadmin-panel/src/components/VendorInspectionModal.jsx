import React, { useState } from 'react';
import {
  X, ExternalLink, ShieldCheck, ShieldAlert, CheckCircle2,
  Building, Phone, Mail, FileText, Image as ImageIcon,
  CreditCard, MapPin, Award, Layers, DollarSign, ZoomIn
} from 'lucide-react';

export const VendorInspectionModal = ({ isOpen, onClose, vendor, onApprove, onReject }) => {
  if (!isOpen || !vendor) return null;

  const docs = vendor.kycDocs || {};
  const turf = vendor.turf || {};
  const sub = vendor.subscription || {};
  const uid = vendor.uid || vendor.id;

  // Collect all available document attachments
  const attachments = [
    { key: 'aadhaar', title: 'Aadhaar Card', url: docs.aadhaarUrl, category: 'Identity' },
    { key: 'pan', title: 'PAN Card', url: docs.panUrl, category: 'Identity' },
    { key: 'gst', title: 'GST Certificate', url: docs.gstUrl, category: 'Business' },
    { key: 'ebBill', title: 'EB / Utility Bill', url: docs.ebBillUrl, category: 'Business' },
    ...(turf.images || []).map((img, idx) => ({
      key: `turf_${idx}`,
      title: `Turf Photo #${idx + 1}`,
      url: img,
      category: 'Venue Photo',
    })),
  ].filter((att) => !!att.url);

  const [selectedDoc, setSelectedDoc] = useState(attachments[0] || null);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200/80 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Building size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                <h3 className="font-black text-white text-base tracking-tight">
                  {vendor.businessName || vendor.turfName || 'Turf Partner'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  vendor.kycStatus === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {vendor.kycStatus === 'approved' ? '✓ Approved' : '⏳ Pending Review'}
                </span>
                {vendor.hasPaidSubscription || sub.active ? (
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-extrabold uppercase flex items-center space-x-1">
                    <CheckCircle2 size={11} className="mr-1 text-emerald-400" />
                    <span>Plan Active</span>
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Owner: <span className="text-slate-200 font-semibold">{vendor.name || 'N/A'}</span> • ID: <span className="font-mono text-slate-300">{uid}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Split: Details Left, Attachment Preview Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden min-h-0">
          
          {/* Left Column: Comprehensive Details (5 Cols) */}
          <div className="lg:col-span-5 p-5 border-r border-slate-100 overflow-y-auto space-y-4 bg-slate-50/60 custom-scrollbar">
            
            {/* 1. Contact & Owner Info */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center">
                <Building size={12} className="mr-1.5 text-emerald-600" />
                Partner & Contact Information
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Business Name:</span>
                  <span className="font-bold text-slate-900">{vendor.businessName || vendor.turfName || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Owner Name:</span>
                  <span className="font-bold text-slate-900">{vendor.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-bold text-slate-900 font-mono">{vendor.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{vendor.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* 2. Tax & Legal Info */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center">
                <FileText size={12} className="mr-1.5 text-indigo-600" />
                Legal & Tax Registration
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">PAN Number:</span>
                  <span className="font-bold text-slate-900 font-mono">{vendor.panNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">GST Number:</span>
                  <span className="font-bold text-slate-900 font-mono">{vendor.gstNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Verification Mode:</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Direct Upload
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Turf Facility Details */}
            {turf && turf.name ? (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center">
                  <MapPin size={12} className="mr-1.5 text-rose-600" />
                  Turf Facility Listing
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Turf Name:</span>
                    <span className="font-bold text-emerald-700">{turf.name}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Location:</span>
                    <span className="font-bold text-slate-900 text-right">{turf.location?.city || turf.city || turf.address || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-100">
                    <span className="text-slate-500">Base Price:</span>
                    <span className="font-bold text-slate-900">₹{turf.pricing?.baseRate || turf.pricePerHour || 800}/hr</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Sports:</span>
                    <span className="font-bold text-slate-900">{(turf.sportTypes || turf.sports || []).join(', ') || 'Cricket, Football'}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* 4. Registration Payment Details */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/90 space-y-2">
              <h4 className="text-[11px] font-black text-emerald-800 uppercase tracking-wider flex items-center">
                <CreditCard size={12} className="mr-1.5 text-emerald-600" />
                Registration & Subscription Payment
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 border-b border-emerald-200/60">
                  <span className="text-emerald-700">Payment Status:</span>
                  <span className="font-black text-emerald-800">✓ PAID & VERIFIED</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-emerald-200/60">
                  <span className="text-emerald-700">Plan Tier:</span>
                  <span className="font-bold text-emerald-900">{sub.planName || sub.plan?.name || 'Pro Partner'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-emerald-200/60">
                  <span className="text-emerald-700">Amount Paid:</span>
                  <span className="font-bold text-emerald-900">₹{sub.amount || sub.plan?.price || '999'}</span>
                </div>
                {sub.razorpayPaymentId && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-emerald-700">Razorpay ID:</span>
                    <span className="font-mono text-[10px] text-emerald-900 truncate max-w-[150px]">{sub.razorpayPaymentId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Attachment Viewer (7 Cols) */}
          <div className="lg:col-span-7 p-5 flex flex-col justify-between overflow-hidden bg-white">
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Header bar with counter and open high-res link */}
              <div className="flex items-center justify-between mb-2.5 shrink-0">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center">
                  <ImageIcon size={14} className="mr-1.5 text-emerald-600" />
                  KYC & Facility Attachments ({attachments.length})
                </h4>
                {selectedDoc?.url && (
                  <a
                    href={selectedDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center space-x-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 transition hover:shadow-sm"
                  >
                    <ZoomIn size={12} />
                    <span>Open high-res</span>
                    <ExternalLink size={10} className="ml-0.5" />
                  </a>
                )}
              </div>

              {/* Attachment selector pills */}
              <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
                {attachments.map((att) => {
                  const isSelected = selectedDoc?.key === att.key;
                  return (
                    <button
                      key={att.key}
                      type="button"
                      onClick={() => setSelectedDoc(att)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 scale-[1.02]'
                          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      <FileText size={12} className={isSelected ? 'text-white' : 'text-slate-400'} />
                      <span>{att.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Document Image Display Container */}
              <div className="flex-1 bg-slate-900/5 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-center overflow-hidden min-h-[200px]">
                {selectedDoc?.url ? (
                  <img
                    src={selectedDoc.url}
                    alt={selectedDoc.title}
                    className="max-h-[36vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200/60 bg-white"
                  />
                ) : (
                  <div className="text-center p-8 text-slate-400">
                    <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-medium">No attachment selected or available for this section.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Close Preview
              </button>

              <div className="flex items-center space-x-2">
                {onReject && (
                  <button
                    type="button"
                    onClick={() => onReject(uid)}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <ShieldAlert size={14} />
                    <span>Reject Application</span>
                  </button>
                )}
                {onApprove && (
                  <button
                    type="button"
                    onClick={() => onApprove(uid)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-md shadow-emerald-600/25 flex items-center space-x-1.5"
                  >
                    <ShieldCheck size={15} />
                    <span>Approve Partner & Turf</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
