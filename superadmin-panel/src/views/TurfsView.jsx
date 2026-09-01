import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Loader2 } from 'lucide-react';

export const TurfsView = ({ onUpdateStats }) => {
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadTurfs = async () => {
    setLoading(true);
    try {
      const res = await api.getAllTurfs(statusFilter);
      setTurfs(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load turfs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTurfs();
  }, [statusFilter]);

  const handleToggleStatus = async (turfId) => {
    try {
      const res = await api.toggleTurfStatus(turfId);
      if (res.success) {
        loadTurfs();
        if (onUpdateStats) onUpdateStats();
      }
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const filteredTurfs = turfs.filter((t) => {
    const q = search.toLowerCase();
    return (
      (t.name || '').toLowerCase().includes(q) ||
      (t.city || '').toLowerCase().includes(q) ||
      (t.address || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Platform Turfs Management</h2>
          <p className="text-xs text-slate-500">All registered turf facilities across cities with live status controls.</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search turfs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-48 transition shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm font-medium"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending Review</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">Turf Name</th>
              <th className="p-3.5">City & Location</th>
              <th className="p-3.5">Sports</th>
              <th className="p-3.5">Base Rate</th>
              <th className="p-3.5">Rating</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">
                  <Loader2 size={20} className="animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Loading turfs...</span>
                </td>
              </tr>
            ) : filteredTurfs.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">
                  No turfs match the current filters.
                </td>
              </tr>
            ) : (
              filteredTurfs.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900 text-xs">{t.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {t.id}</p>
                  </td>
                  <td className="p-3.5 text-slate-600">
                    <p className="font-semibold text-slate-900">{t.city || 'N/A'}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{t.address || ''}</p>
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {(t.sportTypes || ['General']).map((s, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold border border-slate-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 font-extrabold text-emerald-600">₹{t.pricing?.baseRate || 0}/hr</td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    ⭐ {t.rating?.avg ? t.rating.avg.toFixed(1) : '5.0'} ({t.rating?.count || 0})
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : t.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleToggleStatus(t.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm ${
                        t.status === 'active'
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      }`}
                    >
                      {t.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
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
