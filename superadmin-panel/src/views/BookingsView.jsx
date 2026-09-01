import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Loader2 } from 'lucide-react';

export const BookingsView = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await api.getAllBookings(statusFilter, dateFilter);
      setBookings(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [statusFilter, dateFilter]);

  const filteredBookings = bookings.filter((b) => {
    const q = search.toLowerCase();
    return (
      (b.turfName || '').toLowerCase().includes(q) ||
      (b.id || '').toLowerCase().includes(q) ||
      (b.sport || '').toLowerCase().includes(q) ||
      (b.userId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Live Platform Bookings Monitor</h2>
          <p className="text-xs text-slate-500">Real-time feed of player reservations, confirmations, and completed matches.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search booking ID / turf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-52 transition shadow-sm"
            />
          </div>

          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm font-medium"
          >
            <option value="">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="reserved">Reserved (Lock)</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
              <th className="p-3.5">User UID</th>
              <th className="p-3.5">Amount</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  <Loader2 size={20} className="animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Loading live bookings...</span>
                </td>
              </tr>
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-400">
                  No bookings found for the selected filter.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-mono text-slate-700 font-bold">
                    #{b.id?.slice(-6).toUpperCase()}
                  </td>
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900 text-xs">{b.turfName || 'Turf Facility'}</p>
                    <p className="text-[11px] text-slate-500">{b.sport || 'Cricket'}</p>
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    <p>{b.date}</p>
                    <p className="text-[11px] text-slate-500">{b.startTime} - {b.endTime}</p>
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px] truncate max-w-[120px]">
                    {b.userId || 'N/A'}
                  </td>
                  <td className="p-3.5 font-black text-emerald-600">₹{b.amount || 0}</td>
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
