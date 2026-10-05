import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { Search, Loader2, IndianRupee, CalendarCheck, CheckCircle2, RotateCw } from 'lucide-react';
import { dedupe } from '../utils/dedupe';
import { ExportMenu } from '../components/ExportMenu';
import { exportToCSV, exportToExcel, formatBookingRecord } from '../utils/exportUtils';

export const BookingsView = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await api.getAllBookings(statusFilter, dateFilter, null, 500);
      setBookings(dedupe(res.data?.items || []));
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [statusFilter, dateFilter]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (!q) return true;
      return (
        (b.turfName || '').toLowerCase().includes(q) ||
        (b.id || '').toLowerCase().includes(q) ||
        (b.sport || '').toLowerCase().includes(q) ||
        (b.userId || '').toLowerCase().includes(q) ||
        (b.userName || '').toLowerCase().includes(q) ||
        (b.userPhone || '').toLowerCase().includes(q)
      );
    });
  }, [bookings, search]);

  // Calculated metrics for active filtered view
  const metrics = useMemo(() => {
    let totalRev = 0;
    let confirmed = 0;
    let completed = 0;
    filteredBookings.forEach((b) => {
      const amt = Number(b.amount || b.totalAmount || 0);
      const st = (b.status || b.bookingStatus || '').toLowerCase();
      if (['confirmed', 'completed'].includes(st)) {
        totalRev += amt;
      }
      if (st === 'confirmed') confirmed++;
      if (st === 'completed') completed++;
    });
    return { totalRev, confirmed, completed };
  }, [filteredBookings]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      alert('No booking records to export.');
      return;
    }
    const formattedData = filteredBookings.map(formatBookingRecord);
    const dateStamp = new Date().toISOString().slice(0, 10);
    exportToCSV(formattedData, `turf_booking_revenue_${dateStamp}.csv`);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (filteredBookings.length === 0) {
      alert('No booking records to export.');
      return;
    }
    const formattedData = filteredBookings.map(formatBookingRecord);
    const dateStamp = new Date().toISOString().slice(0, 10);
    exportToExcel(formattedData, `turf_booking_revenue_${dateStamp}.xlsx`, 'Booking Revenue');
  };

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>Live Platform Bookings & Revenue Monitor</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time feed of player reservations, confirmations, revenue settlement, and match slots.
          </p>
        </div>

        {/* Action Buttons: Export & Refresh */}
        <div className="flex items-center gap-2">
          <ExportMenu
            label="Download Revenue Report"
            onExportCSV={handleExportCSV}
            onExportExcel={handleExportExcel}
            count={filteredBookings.length}
            disabled={loading || filteredBookings.length === 0}
            loading={exporting}
          />

          <button
            onClick={loadBookings}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 shadow-sm transition"
            title="Refresh bookings"
          >
            <RotateCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
          </button>
        </div>
      </div>

      {/* Revenue KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filtered Revenue</span>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              ₹{metrics.totalRev.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <IndianRupee size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Bookings</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{filteredBookings.length}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
            <CalendarCheck size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirmed / Completed</span>
            <div className="text-xl font-black text-slate-800 mt-0.5">
              {metrics.confirmed + metrics.completed}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search booking ref, turf, sport, player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-full transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="reserved">Reserved (Lock)</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {(search || dateFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setDateFilter('');
                setStatusFilter('');
              }}
              className="text-xs text-red-600 hover:underline font-bold px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">Booking Ref</th>
              <th className="p-3.5">Turf & Sport</th>
              <th className="p-3.5">Date & Slot Time</th>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Revenue / Amount</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-400">
                  <Loader2 size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Loading live bookings...</span>
                </td>
              </tr>
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-400">
                  No bookings found for the selected filter.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono text-slate-700 font-bold">
                    #{b.id?.slice(-8).toUpperCase()}
                  </td>
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900 text-xs">{b.turfName || 'Turf Facility'}</p>
                    <p className="text-[11px] text-slate-500">{b.sport || 'Cricket'}</p>
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    <p>{b.date}</p>
                    <p className="text-[11px] text-slate-500">{b.startTime} - {b.endTime}</p>
                  </td>
                  <td className="p-3.5 text-slate-700">
                    <p className="font-bold text-slate-900">{b.userName || 'Player'}</p>
                    <p className="text-slate-400 font-mono text-[11px] truncate max-w-[140px]">
                      {b.userPhone || b.userId || 'N/A'}
                    </p>
                  </td>
                  <td className="p-3.5 font-black text-emerald-600 text-sm">
                    ₹{Number(b.amount || b.totalAmount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : b.status === 'completed'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : b.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
