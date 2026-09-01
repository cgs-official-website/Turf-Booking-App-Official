import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, MapPin, Phone, Mail, Loader2 } from 'lucide-react';

export const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getAllUsers();
      setUsers(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.location?.city || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Registered Players & Customers</h2>
          <p className="text-xs text-slate-500">All customer accounts created via OTP or Google Sign-In.</p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-56 transition shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs min-w-[650px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">Player Name</th>
              <th className="p-3.5">Contact (Phone/Email)</th>
              <th className="p-3.5">Location / City</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">User UID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  <Loader2 size={20} className="animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Loading registered players...</span>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  No player accounts found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.uid || u.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5 font-bold text-slate-900 text-xs">
                    {u.name || 'Turf Player'}
                  </td>
                  <td className="p-3.5 text-slate-600">
                    <p className="flex items-center"><Phone size={11} className="mr-1 text-slate-400" />{u.phone || 'N/A'}</p>
                    <p className="flex items-center text-[11px] text-slate-500 mt-0.5"><Mail size={11} className="mr-1 text-slate-400" />{u.email || 'N/A'}</p>
                  </td>
                  <td className="p-3.5 text-slate-700">
                    <span className="flex items-center font-medium">
                      <MapPin size={12} className="text-emerald-600 mr-1" />
                      <span>{u.location?.city || u.city || 'Location unset'}</span>
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono text-[10px] truncate max-w-[130px]">
                    {u.uid || u.id}
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
