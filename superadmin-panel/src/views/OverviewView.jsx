import React, { useState } from 'react';
import { KpiCards } from '../components/KpiCards';
import { Clock, ArrowRight, CheckCircle2, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { dedupe } from '../utils/dedupe';
import { api } from '../api/client';
import { ExportMenu } from '../components/ExportMenu';
import { exportToCSV, exportToExcel, formatBookingRecord, formatVendorRecord } from '../utils/exportUtils';

export const OverviewView = ({ stats = {}, recentBookings = [], recentVendors = [], onNavigateTab }) => {
  const uniqueBookings = dedupe(recentBookings);
  const uniqueVendors = dedupe(recentVendors);

  const [loadingBookingsExport, setLoadingBookingsExport] = useState(false);
  const [loadingVendorsExport, setLoadingVendorsExport] = useState(false);

  const handleExportBookings = async (type) => {
    setLoadingBookingsExport(true);
    try {
      const res = await api.getAllBookings(null, null, null, 1000);
      const items = res.data?.items || [];
      if (items.length === 0) {
        alert('No booking revenue records to export.');
        return;
      }
      const formatted = items.map(formatBookingRecord);
      const dateStamp = new Date().toISOString().slice(0, 10);
      if (type === 'csv') {
        exportToCSV(formatted, `turf_booking_revenue_${dateStamp}.csv`);
      } else {
        exportToExcel(formatted, `turf_booking_revenue_${dateStamp}.xlsx`, 'Booking Revenue');
      }
    } catch (err) {
      console.error('Failed to export bookings:', err);
      alert('Could not export booking records: ' + (err.message || 'Error'));
    } finally {
      setLoadingBookingsExport(false);
    }
  };

  const handleExportVendors = async (type) => {
    setLoadingVendorsExport(true);
    try {
      const res = await api.getAllVendors(null, null, 1000);
      const items = res.data?.items || [];
      if (items.length === 0) {
        alert('No vendor registration records to export.');
        return;
      }
      const formatted = items.map(formatVendorRecord);
      const dateStamp = new Date().toISOString().slice(0, 10);
      if (type === 'csv') {
        exportToCSV(formatted, `vendor_registration_records_${dateStamp}.csv`);
      } else {
        exportToExcel(formatted, `vendor_registration_records_${dateStamp}.xlsx`, 'Vendor Records');
      }
    } catch (err) {
      console.error('Failed to export vendors:', err);
      alert('Could not export vendor records: ' + (err.message || 'Error'));
    } finally {
      setLoadingVendorsExport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <KpiCards stats={stats} />

      {/* Quick Export Reports Toolbar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Download size={16} />
            </span>
            <h3 className="font-extrabold text-sm text-white">Platform Analytics & Audit Reports</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Instant CSV & Excel spreadsheet export for financial audits, booking revenue reconciliation, and partner KYC onboarding logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <ExportMenu
            label="Booking Revenue"
            loading={loadingBookingsExport}
            onExportCSV={() => handleExportBookings('csv')}
            onExportExcel={() => handleExportBookings('excel')}
          />
          <ExportMenu
            label="Vendor Records"
            loading={loadingVendorsExport}
            onExportCSV={() => handleExportVendors('csv')}
            onExportExcel={() => handleExportVendors('excel')}
          />
        </div>
      </div>

      {/* Two Column Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Bookings Stream */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <h3 className="font-extrabold text-slate-900 text-sm">Recent Platform Bookings</h3>
            </div>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center space-x-1 font-bold"
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {recentBookings.length === 0 ? (
            <p className="text-slate-400 text-xs py-8 text-center font-medium">No platform bookings recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {recentBookings.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{b.turfName || 'Turf Facility'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {b.sport || 'Cricket'} • {b.date} ({b.startTime} - {b.endTime})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-600 text-xs">₹{b.amount || 0}</span>
                    <span
                      className={`block text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'confirmed'
                          ? 'text-emerald-600'
                          : b.status === 'completed'
                          ? 'text-blue-600'
                          : b.status === 'cancelled'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending KYC Approval Queue */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-amber-500" />
              <h3 className="font-extrabold text-slate-900 text-sm">Pending KYC & Turf Verifications</h3>
            </div>
            <button
              onClick={() => onNavigateTab('kyc')}
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center space-x-1 font-bold"
            >
              <span>Review Desk</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {recentVendors.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 size={28} className="text-emerald-500 mx-auto" />
              <p className="text-slate-900 font-bold text-xs">All Partners Verified</p>
              <p className="text-slate-500 text-[11px]">No pending KYC applications waiting in the queue.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentVendors.slice(0, 5).map((v) => (
                <div
                  key={v.uid || v.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{v.name || 'Partner'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {v.businessName || 'Business entity'} • {v.turfName || 'Turf Facility'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {v.kycStatus || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
