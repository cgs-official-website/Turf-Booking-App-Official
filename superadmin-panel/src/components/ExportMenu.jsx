import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react';

export const ExportMenu = ({
  onExportCSV,
  onExportExcel,
  label = 'Export',
  disabled = false,
  loading = false,
  count = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-bold rounded-xl text-slate-700 transition flex items-center space-x-1.5 border border-slate-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        title="Download CSV or Excel report"
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin text-emerald-600" />
        ) : (
          <Download size={13} className="text-emerald-600" />
        )}
        <span>{label}</span>
        {count !== null && (
          <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded-md font-bold">
            {count}
          </span>
        )}
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-1.5 w-48 rounded-xl shadow-lg bg-white ring-1 ring-black/5 border border-slate-100 z-50 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onExportExcel) onExportExcel();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg flex items-center space-x-2 transition"
            >
              <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
              <div>
                <span className="block font-bold">Download Excel</span>
                <span className="block text-[10px] text-slate-400 font-normal">Microsoft Excel (.xlsx)</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onExportCSV) onExportCSV();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-lg flex items-center space-x-2 transition mt-0.5"
            >
              <FileText size={15} className="text-blue-600 shrink-0" />
              <div>
                <span className="block font-bold">Download CSV</span>
                <span className="block text-[10px] text-slate-400 font-normal">Comma Separated (.csv)</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
