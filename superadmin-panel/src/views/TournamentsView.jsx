import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useModal } from '../context/ModalContext';
import {
  Trophy,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Users,
  Award,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  Mail,
  FileText,
  Shield,
  User,
  Share2,
  Copy,
  Activity,
  Radio,
} from 'lucide-react';

const POPULAR_SPORTS = [
  'Cricket',
  'Football',
  'Badminton',
  'Tennis',
  'Volleyball',
  'Basketball',
  'Table Tennis',
  'Futsal',
  'Pickleball',
  'Other',
];

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export const TournamentsView = () => {
  const { showAlert } = useModal();

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'turf_hosted' | 'user_created'
  const [sportFilter, setSportFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load Tournaments
  const loadTournaments = async () => {
    setLoading(true);
    try {
      const res = await api.getAllTournaments();
      const list = res.data?.tournaments || res.tournaments || [];
      setTournaments(list);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      showAlert({
        title: 'Fetch Error',
        message: err.message || 'Failed to load tournaments monitoring data.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  // Filtered Tournaments
  const filteredTournaments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tournaments.filter((t) => {
      const isUser = t.creatorType === 'USER' || t.source === 'USER CREATED';

      // Source Filter
      if (sourceFilter === 'turf_hosted' && isUser) return false;
      if (sourceFilter === 'user_created' && !isUser) return false;

      // Status filter
      if (statusFilter !== 'all' && (t.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Sport filter
      if (sportFilter !== 'all' && (t.sport || '').toLowerCase() !== sportFilter.toLowerCase()) {
        return false;
      }
      // Search query
      if (q) {
        const matchesQuery =
          (t.name || '').toLowerCase().includes(q) ||
          (t.sport || '').toLowerCase().includes(q) ||
          (t.venueName || '').toLowerCase().includes(q) ||
          (t.turfName || '').toLowerCase().includes(q) ||
          (t.turf?.name || '').toLowerCase().includes(q) ||
          (t.city || '').toLowerCase().includes(q) ||
          (t.creator || '').toLowerCase().includes(q) ||
          (t.creatorName || '').toLowerCase().includes(q) ||
          (t.vendorName || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [tournaments, search, statusFilter, sourceFilter, sportFilter]);

  // Status & Source counters
  const totalCount = tournaments.length;
  const turfHostedCount = tournaments.filter(
    (t) => t.creatorType !== 'USER' && t.source !== 'USER CREATED'
  ).length;
  const userCreatedCount = tournaments.filter(
    (t) => t.creatorType === 'USER' || t.source === 'USER CREATED'
  ).length;
  const publishedCount = tournaments.filter(
    (t) => (t.status || '').toLowerCase() === 'published'
  ).length;
  const draftCount = tournaments.filter(
    (t) => (t.status || '').toLowerCase() === 'draft'
  ).length;

  const handleOpenDetail = (tournament) => {
    setSelectedTournament(tournament);
    setCopiedLink(false);
    setIsDetailOpen(true);
  };

  const handleCopyShareLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Badge Color Helper
  const getStatusBadge = (status) => {
    const s = (status || 'draft').toLowerCase();
    switch (s) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Published
          </span>
        );
      case 'ongoing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Live Ongoing
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800">
            Cancelled
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800">
            Draft
          </span>
        );
    }
  };

  const getSourceBadge = (isUserCreated) => {
    if (isUserCreated) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700 shadow-xs">
          <User size={11} className="text-purple-600 dark:text-purple-400" />
          <span>USER CREATED</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700 shadow-xs">
        <Shield size={11} className="text-teal-600 dark:text-teal-400" />
        <span>TURF HOSTED</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ── Top Header Banner (Monitoring Module) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Trophy size={18} />
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Tournaments Monitoring
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Governance View
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor turf-hosted championships and community user tournaments conducted at partner venues.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={loadTournaments}
            disabled={loading}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:bg-slate-100 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 transition flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            title="Refresh Tournaments"
          >
            <RefreshCw size={13} className={`text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Tournaments
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={12} />
            <span>Turf Hosted</span>
          </div>
          <div className="text-xl font-black text-teal-600 dark:text-teal-400 mt-0.5">{turfHostedCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <User size={12} />
            <span>User Created</span>
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{userCreatedCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Published</span>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{publishedCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Drafts
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{draftCount}</div>
        </div>
      </div>

      {/* ── Filters & Search Control Bar ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tournament, turf, creator, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Source Type Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Sources</option>
              <option value="turf_hosted">Turf Hosted</option>
              <option value="user_created">User Created</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="ongoing">Live Ongoing</option>
              <option value="draft">Drafts</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Sport Filter */}
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Sports</option>
              {POPULAR_SPORTS.filter((s) => s !== 'Other').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* View Switcher Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Card View"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Table View"
              >
                <TableIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tournaments Content Area ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <RefreshCw size={28} className="animate-spin text-emerald-600 mb-3" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading tournaments database...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 mx-auto mb-3.5 shadow-xs">
            <Trophy size={28} />
          </div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white">No Tournaments Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {search || statusFilter !== 'all' || sourceFilter !== 'all' || sportFilter !== 'all'
              ? 'No tournaments match your current filters. Try resetting the filters.'
              : 'There are no tournaments currently recorded in the platform database.'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ── CARDS GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTournaments.map((t) => {
            const isUserCreated = t.creatorType === 'USER' || t.source === 'USER CREATED';
            const hostTurf = t.turf?.name || t.turfName || t.venueName || 'Host Arena';
            const turfCity = t.turf?.city || t.city || 'Tamil Nadu';
            const turfOwner = t.vendorName || t.turfOwner || t.vendor?.businessName || t.vendor?.fullName || 'Turf Partner';
            const creatorDisplay = t.creator || t.creatorName || (isUserCreated ? 'Athlete / User' : hostTurf);

            return (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header & Banner */}
                  <div className="h-32 bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 relative overflow-hidden flex items-end p-3.5">
                    {t.bannerUrl ? (
                      <img
                        src={t.bannerUrl}
                        alt={t.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950 via-slate-900 to-teal-950 opacity-90" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent" />

                    <div className="relative z-10 flex items-center justify-between w-full">
                      {getSourceBadge(isUserCreated)}
                      {getStatusBadge(t.status)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {t.sport || 'Sports'}
                        </span>
                        {t.oversPerTeam ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                            🏏 {t.oversPerTeam} Overs
                          </span>
                        ) : null}
                      </div>

                      <h4 className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {t.name}
                      </h4>

                      {/* Host Turf Venue */}
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mt-1 font-semibold">
                        <MapPin size={12} className="text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {hostTurf} • <span className="text-slate-400 font-normal">{turfCity}</span>
                        </span>
                      </p>
                    </div>

                    {/* Ownership & Creator Breakdown */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 space-y-1.5 border border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <User size={12} className="text-purple-500" />
                          Creator:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                          {creatorDisplay} ({isUserCreated ? 'User' : 'Vendor'})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <Shield size={12} className="text-teal-500" />
                          Turf Owner:
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                          {turfOwner}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar size={12} className="text-slate-400" />
                          Dates:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatDate(t.startDate)} - {formatDate(t.endDate)}
                        </span>
                      </div>
                    </div>

                    {/* Metric Pills */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Teams</div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                          <Users size={11} className="text-slate-400" />
                          <span>{t.numberOfTeams || t.participantCapacity || 2} Teams</span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Squad Size</div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
                          {t.playersPerTeam || 11} / Team
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">
                    ID: <span className="font-mono text-[10px]">{String(t.id).slice(0, 8)}...</span>
                  </div>

                  <button
                    onClick={() => handleOpenDetail(t)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE MONITORING VIEW ── */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Tournament</th>
                  <th className="py-3 px-4">Source Type</th>
                  <th className="py-3 px-4">Creator</th>
                  <th className="py-3 px-4">Host Turf & Owner</th>
                  <th className="py-3 px-4">Sport & Overs</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Teams</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-semibold">
                {filteredTournaments.map((t) => {
                  const isUserCreated = t.creatorType === 'USER' || t.source === 'USER CREATED';
                  const hostTurf = t.turf?.name || t.turfName || t.venueName || 'Host Arena';
                  const turfOwner = t.vendorName || t.turfOwner || t.vendor?.businessName || t.vendor?.fullName || 'Turf Partner';
                  const creatorDisplay = t.creator || t.creatorName || (isUserCreated ? 'User Athlete' : hostTurf);

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition group"
                    >
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-black text-slate-900 dark:text-white group-hover:text-emerald-600 transition truncate">
                          {t.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          ID: {String(t.id).slice(0, 8)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getSourceBadge(isUserCreated)}
                      </td>

                      <td className="py-3.5 px-4 max-w-[140px]">
                        <div className="text-slate-800 dark:text-slate-200 truncate font-bold">
                          {creatorDisplay}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isUserCreated ? 'User Created' : 'Vendor Hosted'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-800 dark:text-slate-200 truncate font-bold">{hostTurf}</div>
                        <div className="text-[10px] text-slate-400 truncate">Owner: {turfOwner}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {t.sport}
                        </span>
                        {t.oversPerTeam ? (
                          <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                            {t.oversPerTeam} Overs
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatDate(t.startDate)} - {formatDate(t.endDate)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {t.numberOfTeams || t.participantCapacity || 2} Teams
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {t.playersPerTeam || 11} / team
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(t.status)}</td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetail(t)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 transition cursor-pointer inline-flex items-center gap-1"
                          title="View Monitoring Details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TOURNAMENT MONITORING DETAILS MODAL ── */}
      {isDetailOpen && selectedTournament && (
        <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden scale-in-95 duration-200">
            {/* Modal Header Banner */}
            <div className="relative h-44 bg-slate-950 overflow-hidden flex items-end p-6 shrink-0">
              {selectedTournament.bannerUrl ? (
                <img
                  src={selectedTournament.bannerUrl}
                  alt={selectedTournament.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/50 to-transparent" />

              <div className="relative z-10 w-full flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getSourceBadge(
                      selectedTournament.creatorType === 'USER' ||
                      selectedTournament.source === 'USER CREATED'
                    )}
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
                      {selectedTournament.sport || 'Sports'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight mt-1">
                    {selectedTournament.name}
                  </h3>
                </div>
                <div>{getStatusBadge(selectedTournament.status)}</div>
              </div>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition cursor-pointer z-20"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Host Turf & Ownership Governance Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Shield size={12} className="text-emerald-500" />
                  <span>Venue & Ownership Governance</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Host Turf</span>
                    <p className="font-extrabold text-slate-800 dark:text-white mt-1">
                      {selectedTournament.turf?.name || selectedTournament.turfName || selectedTournament.venueName || 'Host Arena'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      📍 {selectedTournament.turf?.city || selectedTournament.city || 'Tamil Nadu, India'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Turf Vendor / Owner</span>
                    <p className="font-extrabold text-slate-800 dark:text-white mt-1">
                      {selectedTournament.vendorName || selectedTournament.turfOwner || selectedTournament.vendor?.businessName || selectedTournament.vendor?.fullName || 'Verified Turf Partner'}
                    </p>
                    {selectedTournament.vendor?.phone && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        📞 {selectedTournament.vendor.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Creator Information */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Creator Details</span>
                    <span className="font-extrabold text-slate-800 dark:text-white mt-0.5 block">
                      {selectedTournament.creator || selectedTournament.creatorName || (selectedTournament.creatorType === 'USER' ? 'User Athlete' : 'Turf Owner')}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Creator Type: {selectedTournament.creatorType === 'USER' ? 'USER' : 'VENDOR'}
                  </span>
                </div>
              </div>

              {/* Tournament Format Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                    Number of Teams
                  </div>
                  <div className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {selectedTournament.numberOfTeams || selectedTournament.participantCapacity || 2} Teams
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Squad Size
                  </div>
                  <div className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTournament.playersPerTeam || 11} / Team
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Start Date
                  </div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1">
                    {formatDate(selectedTournament.startDate)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    End Date
                  </div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1">
                    {formatDate(selectedTournament.endDate)}
                  </div>
                </div>
              </div>

              {/* Cricket Overs Alert if applicable */}
              {selectedTournament.oversPerTeam ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <span>🏏 Cricket Rule:</span>
                  <span>{selectedTournament.oversPerTeam} overs per side / innings</span>
                </div>
              ) : null}

              {/* Teams & Squad Rosters Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Users size={12} className="text-emerald-500" />
                  <span>Configured Teams & Squad Rosters</span>
                </h4>

                {Array.isArray(selectedTournament.teams) && selectedTournament.teams.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedTournament.teams.map((team, idx) => {
                      const players = Array.isArray(team.players) ? team.players : [];
                      const maxCap = selectedTournament.playersPerTeam || 11;
                      const isFull = players.length >= maxCap;

                      return (
                        <div
                          key={team.id || idx}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-slate-800 dark:text-white">
                              {team.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isFull
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {players.length} / {maxCap} Players
                            </span>
                          </div>

                          {players.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {players.map((p, pIdx) => (
                                <span
                                  key={p.id || pIdx}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
                                >
                                  <span>👤 {p.name}</span>
                                  {p.phone && <span className="text-slate-400 text-[10px]">({p.phone})</span>}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No players registered yet.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Squads configured for {selectedTournament.numberOfTeams || 2} teams (up to {selectedTournament.playersPerTeam || 11} players/team).
                  </p>
                )}
              </div>

              {/* Public Shareable Link */}
              {selectedTournament.shareableUrl && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Share2 size={12} className="text-emerald-500" />
                    <span>Public Shareable URL</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedTournament.shareableUrl}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 select-all"
                    />
                    <button
                      onClick={() => handleCopyShareLink(selectedTournament.shareableUrl)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Copy size={13} />
                      <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedTournament.description ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Tournament Description
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {selectedTournament.description}
                  </p>
                </div>
              ) : null}

              {/* Rules */}
              {selectedTournament.rules ? (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Rules & Regulations
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                    {selectedTournament.rules}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-mono">
                Tournament ID: {selectedTournament.id}
              </span>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Monitoring Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
