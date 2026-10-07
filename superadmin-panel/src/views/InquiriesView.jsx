import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useModal } from '../context/ModalContext';
import {
  Inbox,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  Filter,
  User,
  Send,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const InquiriesView = ({ onUpdateStats }) => {
  const { showAlert, showConfirm } = useModal();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'contacted', 'resolved'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'Player', 'Vendor', 'Corporate', 'Franchise'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await api.getAllEnquiries();
      const list = res.data?.enquiries || [];
      setInquiries(list);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await api.updateEnquiryStatus(id, newStatus);
      if (res && (res.success || res.data)) {
        setInquiries((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
        if (onUpdateStats) onUpdateStats();
      }
    } catch (err) {
      showAlert({
        title: 'Update Failed',
        message: err.message || 'Could not update inquiry status.',
        type: 'error',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id, submitterName) => {
    const confirmed = await showConfirm({
      title: 'Delete Inquiry',
      message: `Are you sure you want to permanently delete the inquiry from ${submitterName || 'this user'}?`,
      type: 'danger',
      confirmText: 'Delete Permanently',
    });

    if (!confirmed) return;

    try {
      await api.deleteEnquiry(id);
      setInquiries((prev) => prev.filter((item) => item.id !== id));
      showAlert({
        title: 'Deleted',
        message: 'Inquiry record removed successfully.',
        type: 'success',
      });
      if (onUpdateStats) onUpdateStats();
    } catch (err) {
      showAlert({
        title: 'Delete Failed',
        message: err.message || 'Could not delete inquiry.',
        type: 'error',
      });
    }
  };

  const handleCopy = (item) => {
    const text = `📋 INQUIRY LEAD
Name: ${item.name}
Role: ${item.userType || 'Player'}
Phone: ${item.phone || 'N/A'}
Email: ${item.email || 'N/A'}
Turf / Facility: ${item.turfName || 'N/A'}
Location: ${item.location || 'N/A'}
Message: ${item.message || 'N/A'}
Submitted: ${new Date(item.createdAt).toLocaleString()}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredInquiries = inquiries.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    if (roleFilter !== 'all') {
      const roleStr = (item.userType || '').toLowerCase();
      if (!roleStr.includes(roleFilter.toLowerCase())) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchEmail = (item.email || '').toLowerCase().includes(q);
      const matchPhone = (item.phone || '').toLowerCase().includes(q);
      const matchTurf = (item.turfName || '').toLowerCase().includes(q);
      const matchMsg = (item.message || '').toLowerCase().includes(q);
      const matchRole = (item.userType || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchTurf && !matchMsg && !matchRole) {
        return false;
      }
    }
    return true;
  });

  const totalCount = inquiries.length;
  const pendingCount = inquiries.filter((i) => i.status === 'pending' || !i.status).length;
  const contactedCount = inquiries.filter((i) => i.status === 'contacted').length;
  const resolvedCount = inquiries.filter((i) => i.status === 'resolved').length;

  const getRoleBadge = (role = '') => {
    const r = role.toLowerCase();
    if (r.includes('vendor') || r.includes('partner') || r.includes('owner')) {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    }
    if (r.includes('corporate') || r.includes('tournament')) {
      return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    }
    if (r.includes('franchise')) {
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    }
    return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  };

  const getStatusBadge = (status = 'pending') => {
    switch (status) {
      case 'resolved':
        return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'contacted':
        return 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <Inbox size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Inquiries & Lead Desk
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time inquiries submitted via the platform landing page, partner onboarding desk, and players.
          </p>
        </div>

        <button
          onClick={fetchInquiries}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
          <span>Refresh Leads</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'all'
              ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold opacity-80">Total Inquiries</div>
          <div className="text-2xl font-black mt-1">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('pending')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold opacity-80">New / Pending</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
            {pendingCount}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('contacted')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'contacted'
              ? 'bg-blue-600 text-white border-blue-700 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="text-xs font-semibold opacity-80">Contacted</div>
          <div className="text-2xl font-black mt-1 text-blue-600 dark:text-blue-400">
            {contactedCount}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('resolved')}
          className={`cursor-pointer p-4 rounded-2xl border transition ${
            statusFilter === 'resolved'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="text-xs font-semibold opacity-80">Resolved</div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {resolvedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search inquiries by name, phone, email, facility, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
            {['all', 'pending', 'contacted', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg font-semibold capitalize transition ${
                  statusFilter === s
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Roles</option>
            <option value="Player">Player</option>
            <option value="Vendor">Vendor / Turf Owner</option>
            <option value="Corporate">Corporate</option>
            <option value="Franchise">Franchise</option>
          </select>
        </div>
      </div>

      {/* Inquiries Content List */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl">
          <RefreshCw size={28} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading incoming inquiries...</p>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mx-auto">
            <Inbox size={26} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No inquiries found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || roleFilter !== 'all'
              ? 'Try adjusting your search query or status filter.'
              : 'When visitors fill out the inquiry form on your website landing page, they will show up here.'}
          </p>
          {(searchQuery || statusFilter !== 'all' || roleFilter !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setRoleFilter('all');
                setSearchQuery('');
              }}
              className="mt-2 text-xs font-semibold text-emerald-600 hover:underline"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((item) => {
            const cleanPhoneDigits = (item.phone || '').replace(/\D/g, '');
            const whatsappUrl = cleanPhoneDigits ? `https://wa.me/91${cleanPhoneDigits}` : null;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all duration-200 space-y-4"
              >
                {/* Top Row: User identity & Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200/60 dark:border-slate-700">
                      {item.name ? item.name.charAt(0).toUpperCase() : <User size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {item.name || 'Anonymous Submitter'}
                        </h3>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getRoleBadge(
                            item.userType
                          )}`}
                        >
                          {item.userType || 'Player'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <Clock size={12} />
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                        {item.sourcePage && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{item.sourcePage}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{item.status || 'Pending'}</span>
                    </span>
                  </div>
                </div>

                {/* Middle: Contact Channels & Location Pill */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                  {item.phone && (
                    <div className="flex items-center space-x-1.5">
                      <a
                        href={`tel:${item.phone}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg border border-slate-200/80 dark:border-slate-700 transition"
                      >
                        <Phone size={13} className="text-emerald-600" />
                        <span className="font-semibold">{item.phone}</span>
                      </a>

                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition"
                          title="Open WhatsApp Chat"
                        >
                          <Send size={13} />
                        </a>
                      )}
                    </div>
                  )}

                  {item.email && (
                    <a
                      href={`mailto:${item.email}`}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg border border-slate-200/80 dark:border-slate-700 transition"
                    >
                      <Mail size={13} className="text-blue-600" />
                      <span className="font-semibold truncate max-w-[220px]">{item.email}</span>
                    </a>
                  )}

                  {item.turfName && (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <Building size={13} />
                      <span className="font-medium">{item.turfName}</span>
                    </div>
                  )}

                  {item.location && item.location !== 'Online' && (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200/80 dark:border-slate-700">
                      <MapPin size={13} />
                      <span className="font-medium">{item.location}</span>
                    </div>
                  )}
                </div>

                {/* Inquiry Message Box */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Requirements / Message:
                  </div>
                  <p className="whitespace-pre-wrap">{item.message || 'No description provided.'}</p>
                </div>

                {/* Bottom Row: Workflow Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(item)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold transition"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check size={13} className="text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Lead</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.status !== 'contacted' && item.status !== 'resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'contacted')}
                        disabled={updatingId === item.id}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition"
                      >
                        Mark Contacted
                      </button>
                    )}

                    {item.status !== 'resolved' ? (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'resolved')}
                        disabled={updatingId === item.id}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center space-x-1.5"
                      >
                        <CheckCircle2 size={13} />
                        <span>Mark Resolved</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'pending')}
                        disabled={updatingId === item.id}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                      >
                        Reopen Lead
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                      title="Delete inquiry"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
