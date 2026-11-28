import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import {
  Search, MapPin, Phone, Mail, Loader2, RotateCw,
  Edit2, Trash2, X, Check, User, Shield, AlertCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { dedupe } from '../utils/dedupe';

export const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  // Edit Player Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    role: 'user',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Delete Confirmation State
  const [deletingUid, setDeletingUid] = useState(null);

  const loadUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await api.getAllUsers();
      setUsers(dedupe(res.data?.items || []));
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    // Auto-poll every 15 seconds to capture live user registrations & profile edits
    const interval = setInterval(() => loadUsers(true), 15000);
    return () => clearInterval(interval);
  }, [loadUsers]);

  const getLocationText = (u) => {
    if (!u) return 'Location unset';
    if (typeof u.location === 'string' && u.location.trim()) {
      return u.location.trim();
    }
    if (u.location && typeof u.location === 'object') {
      return u.location.city || u.location.address || 'Location unset';
    }
    return u.city || u.address || 'Location unset';
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      location: typeof u.location === 'string' ? u.location : (u.location?.city || u.city || ''),
      role: u.role || 'user',
    });
    setSaveMessage(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaveLoading(true);
    setSaveMessage(null);

    try {
      const uid = editingUser.uid || editingUser.id;
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        location: editForm.location.trim(),
        role: editForm.role,
      };

      await api.updateUser(uid, payload);
      setSaveMessage({ type: 'success', text: 'Player updated successfully!' });

      // Update local state immediately
      setUsers((prev) =>
        prev.map((item) => ((item.uid || item.id) === uid ? { ...item, ...payload } : item))
      );

      setTimeout(() => {
        setEditingUser(null);
        setSaveMessage(null);
      }, 1000);
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to update player profile' });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!window.confirm('Are you sure you want to delete this player account?')) return;
    setDeletingUid(uid);
    try {
      await api.deleteUser(uid);
      setUsers((prev) => prev.filter((item) => (item.uid || item.id) !== uid));
    } catch (err) {
      alert(err.message || 'Failed to delete player account');
    } finally {
      setDeletingUid(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const loc = getLocationText(u).toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.uid || u.id || '').toLowerCase().includes(q) ||
      loc.includes(q)
    );
  });

  // Pagination: search runs on ALL players first, then results are split into pages of 10
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);
  const pageNumbers = useMemo(() => {
    const out = [];
    const from = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    const to = Math.min(totalPages, from + 4);
    for (let i = from; i <= to; i += 1) out.push(i);
    return out;
  }, [safePage, totalPages]);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900">Registered Players & Customers</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {users.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500">All customer accounts created via OTP or Google Sign-In with real-time updates.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadUsers(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
            title="Refresh list from database"
          >
            <RotateCw size={13} className={refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-64 transition shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} title="Clear search" className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs min-w-[720px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3.5">Player Details</th>
              <th className="p-3.5">Contact (Phone / Email)</th>
              <th className="p-3.5">Location / City</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">User UID</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-400">
                  <Loader2 size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
                  <span>Loading registered players...</span>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-slate-400">
                  <User size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">No player accounts found.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Try refining your search query or registering in the User App.</p>
                </td>
              </tr>
            ) : (
              pagedUsers.map((u) => {
                const uid = u.uid || u.id;
                const locText = getLocationText(u);
                const isLocationSet = locText !== 'Location unset';

                return (
                  <tr key={uid} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        {u.avatar || u.photoURL ? (
                          <img
                            src={u.avatar || u.photoURL}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                            {(u.name || 'P')[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{u.name || 'Turf Player'}</p>
                          <p className="text-[10px] text-slate-400">
                            Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <p className="flex items-center">
                        <Phone size={11} className="mr-1 text-slate-400 shrink-0" />
                        <span className={u.phone ? 'font-medium text-slate-800' : 'text-slate-400'}>
                          {u.phone || 'N/A'}
                        </span>
                      </p>
                      <p className="flex items-center text-[11px] text-slate-500 mt-0.5">
                        <Mail size={11} className="mr-1 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{u.email || 'N/A'}</span>
                      </p>
                    </td>
                    <td className="p-3.5 text-slate-700">
                      <span className="flex items-center font-medium">
                        <MapPin size={12} className={`mr-1.5 shrink-0 ${isLocationSet ? 'text-emerald-600' : 'text-slate-300'}`} />
                        <span className={isLocationSet ? 'text-slate-800 font-semibold' : 'text-slate-400 italic'}>
                          {locText}
                        </span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono text-[10px] truncate max-w-[140px]" title={uid}>
                      {uid}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          title="Edit Player Details"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(uid)}
                          disabled={deletingUid === uid}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          title="Delete Player Account"
                        >
                          {deletingUid === uid ? <Loader2 size={13} className="animate-spin text-red-500" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        {!loading && filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-900">{pageStart + 1}</strong> to{' '}
              <strong className="text-slate-900">{Math.min(pageStart + PAGE_SIZE, filteredUsers.length)}</strong> of{' '}
              <strong className="text-slate-900">{filteredUsers.length}</strong> players
              {search && <span className="text-slate-400"> (filtered from {users.length})</span>}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={safePage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronsLeft size={13} /></button>
                <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={13} /></button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold border transition ${n === safePage ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {n}
                  </button>
                ))}
                <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={13} /></button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronsRight size={13} /></button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Player Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <User size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Edit Player Profile</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{editingUser.uid || editingUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              {saveMessage && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${saveMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                >
                  {saveMessage.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{saveMessage.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Player Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Mohamed Asfaque"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="e.g. player@example.com"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location / City</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="e.g. Chennai, Tamil Nadu"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Permission</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                >
                  <option value="user">USER (Standard Player)</option>
                  <option value="admin">ADMIN (Super Admin Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {saveLoading && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
