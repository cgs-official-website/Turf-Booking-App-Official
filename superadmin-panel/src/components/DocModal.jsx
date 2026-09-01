import React from 'react';
import { X, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react';

export const DocModal = ({ isOpen, onClose, title, imageUrl, onApprove, onReject }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="font-extrabold text-slate-900 text-sm">{title || 'Document Preview'}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Image Viewer */}
        <div className="my-4 bg-slate-50 border border-slate-100 rounded-xl p-3 flex-1 flex items-center justify-center overflow-auto min-h-[300px]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
            />
          ) : (
            <p className="text-slate-400 text-xs font-medium">No image preview available for this document.</p>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          {imageUrl && (
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center space-x-1 font-bold"
            >
              <ExternalLink size={12} />
              <span>Open in new tab</span>
            </a>
          )}
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Close
            </button>
            {onReject && (
              <button
                onClick={onReject}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <ShieldAlert size={14} />
                <span>Reject</span>
              </button>
            )}
            {onApprove && (
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-500/20 flex items-center space-x-1"
              >
                <ShieldCheck size={14} />
                <span>Approve</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
