import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import {
  Trophy,
  Key,
  Users,
  Loader2,
  Coins,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Calendar,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import { dedupe } from '../utils/dedupe';
<<<<<<< Updated upstream
=======
import { useModal } from '../context/ModalContext';
import { MatchDetailModal } from '../components/MatchDetailModal';
>>>>>>> Stashed changes

export const MatchesView = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

<<<<<<< Updated upstream
=======
  // Command & Modal states
  const [commandMatch, setCommandMatch] = useState(null);

  // Auto-polling state (live feed every 10s)
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCountdown, setRefreshCountdown] = useState(10);
  const autoRefreshTimerRef = useRef(null);

>>>>>>> Stashed changes
  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, live, created, completed, cancelled
  const [sportFilter, setSportFilter] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const res = await api.getAllMatches();
      const items = dedupe(res.data?.items || []);
      setMatches(items);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  // Copy join code helper
  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

<<<<<<< Updated upstream
=======
  // Quick delete match
  const handleQuickDelete = async (match, e) => {
    if (e) e.stopPropagation();
    const confirmed = await showConfirm({
      title: 'Disband & Delete Match',
      message: `Delete match fixture "${match.place || match.id}"?\nThis removes all community scorecard records.`,
      type: 'danger',
      confirmText: 'Delete Match',
    });
    if (!confirmed) return;

    try {
      const res = await api.deleteAdminMatch(match.id);
      if (res.success) {
        setMatches((prev) => prev.filter((m) => m.id !== match.id));
        showAlert({
          title: 'Match Removed',
          message: 'Match fixture deleted successfully.',
          type: 'success',
        });
      }
    } catch (err) {
      showAlert({
        title: 'Delete Failed',
        message: err.message || 'Could not delete match',
        type: 'error',
      });
    }
  };

  // Callback when match updated or deleted from Command Modal
  const handleMatchUpdatedFromModal = (updatedMatch, deletedId) => {
    if (deletedId) {
      setMatches((prev) => prev.filter((m) => m.id !== deletedId));
    } else if (updatedMatch) {
      setMatches((prev) =>
        prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
      );
    }
  };

>>>>>>> Stashed changes
  // Distinct sports list for filter dropdown
  const sportsList = useMemo(() => {
    const list = new Set();
    matches.forEach((m) => {
      if (m.sport) list.add(m.sport);
    });
    return Array.from(list);
  }, [matches]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return matches.filter((m) => {
      // Status filter
      if (statusFilter !== 'all' && (m.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Sport filter
      if (sportFilter !== 'all' && (m.sport || '').toLowerCase() !== sportFilter.toLowerCase()) {
        return false;
      }
      // Search query
      if (q) {
        const matchesQuery =
          (m.sport || '').toLowerCase().includes(q) ||
          (m.place || '').toLowerCase().includes(q) ||
          (m.creatorName || '').toLowerCase().includes(q) ||
          (m.joinCode || '').toLowerCase().includes(q) ||
          (m.id || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [matches, search, statusFilter, sportFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sportFilter, itemsPerPage]);

  // Pagination calculations
  const totalItems = filteredMatches.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentMatches = filteredMatches.slice(startIndex, endIndex);

  // Generate page numbers for navigation
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (validCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (validCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // Status counters for summary badges
  const liveCount = matches.filter((m) => (m.status || '').toLowerCase() === 'live').length;
  const createdCount = matches.filter((m) => ['created', 'upcoming'].includes((m.status || '').toLowerCase())).length;
  const completedCount = matches.filter((m) => (m.status || '').toLowerCase() === 'completed').length;

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
<<<<<<< Updated upstream
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="text-amber-500" size={20} />
            <span>Community Matches & Live Scorecards</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor community tournaments, live score feeds, toss status, and join codes across venues.
          </p>
        </div>

        <button
          onClick={loadMatches}
          disabled={loading}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-bold rounded-xl text-slate-700 transition flex items-center space-x-1.5 border border-slate-200 shadow-sm self-start sm:self-auto"
        >
          <RefreshCw size={13} className={`text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
=======
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
              <Flame size={12} className="text-emerald-600" />
              <span>Super Admin Monitor</span>
            </span>
            {liveCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-[10px] uppercase tracking-wider inline-flex items-center gap-1 animate-pulse">
                <Radio size={12} className="text-rose-600" />
                <span>{liveCount} Live Matches</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1.5">
            <Trophy className="text-amber-500" size={24} />
            <span>Community Matches & Live Scorecards</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium">
            Monitor community matches and live scorecards in real time. Read-only view; only abusive or fake matches can be deleted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 border shadow-sm ${autoRefresh
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            title="Auto-fetch live score updates every 10s"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            <span>Live Sync: {autoRefresh ? `ON (${refreshCountdown}s)` : 'OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => loadMatches(false)}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-bold rounded-xl text-slate-700 transition flex items-center border border-slate-200 shadow-sm"
            title="Refresh Match Data"
          >
            <RefreshCw size={14} className={`text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Featured Live Match Ticker Ribbon (if live matches exist) */}
      {liveMatches.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-slate-900 rounded-3xl p-4 sm:p-5 shadow-sm border border-emerald-200/70 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-emerald-100">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">
                🔴 LIVE MATCH TICKER FEED
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              Click any match to view its scorecard
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveMatches.map((lm) => {
              const inn = lm.innings || lm.scorecard?.innings || [];
              const tA = inn[0] || { runs: 0, wickets: 0, overs: '0.0' };
              const tB = inn[1] || { runs: 0, wickets: 0, overs: '0.0' };
              const tAName = lm.teams?.A?.name || 'Team A';
              const tBName = lm.teams?.B?.name || 'Team B';

              return (
                <div
                  key={`ticker-${lm.id}`}
                  onClick={() => setCommandMatch(lm)}
                  className="bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-400 rounded-2xl p-3.5 cursor-pointer transition shadow-sm hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-emerald-700 uppercase tracking-wide">{lm.sport || 'Cricket'}</span>
                      <span className="font-mono text-slate-500">#{lm.joinCode || lm.id.slice(-6)}</span>
                    </div>
                    <div className="font-black text-sm text-slate-900 mt-1 truncate">
                      {lm.place || 'Turf Arena'}
                    </div>

                    {/* Head-to-head score comparison */}
                    <div className="mt-2.5 bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800 truncate max-w-[120px] flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-emerald-100 text-[9px] font-black flex items-center justify-center text-emerald-700 shrink-0">A</span>
                          <span className="truncate">{tAName}</span>
                        </span>
                        <span className="font-mono text-xs font-black text-slate-900 flex items-center gap-1">
                          <span>{tA.runs || 0}/{tA.wickets || 0}</span>
                          <span className="text-[10px] text-slate-500 font-normal">({tA.overs || '0.0'} ov)</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800 truncate max-w-[120px] flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-emerald-100 text-[9px] font-black flex items-center justify-center text-emerald-700 shrink-0">B</span>
                          <span className="truncate">{tBName}</span>
                        </span>
                        <span className="font-mono text-xs font-black text-slate-900 flex items-center gap-1">
                          <span>{tB.runs || 0}/{tB.wickets || 0}</span>
                          <span className="text-[10px] text-slate-500 font-normal">({tB.overs || '0.0'} ov)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Host: <strong className="text-slate-900">{lm.creatorName || 'Player'}</strong></span>
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1 hover:underline">
                      <span>View Scorecard</span>
                      <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setStatusFilter('all')}
          className={`bg-white border rounded-2xl p-3.5 shadow-sm cursor-pointer transition hover:border-slate-300 ${statusFilter === 'all' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80'
            }`}
        >
>>>>>>> Stashed changes
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Matches</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{matches.length}</div>
        </div>
<<<<<<< Updated upstream
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
=======

        <div
          onClick={() => setStatusFilter('live')}
          className={`bg-white border rounded-2xl p-3.5 shadow-sm cursor-pointer transition hover:border-emerald-400 ${statusFilter === 'live' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80'
            }`}
        >
>>>>>>> Stashed changes
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Matches</span>
          </div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{liveCount}</div>
        </div>
<<<<<<< Updated upstream
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
=======

        <div
          onClick={() => setStatusFilter('created')}
          className={`bg-white border rounded-2xl p-3.5 shadow-sm cursor-pointer transition hover:border-blue-400 ${statusFilter === 'created' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/80'
            }`}
        >
>>>>>>> Stashed changes
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Scheduled</div>
          <div className="text-xl font-black text-slate-800 mt-0.5">{createdCount}</div>
        </div>
<<<<<<< Updated upstream
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</div>
          <div className="text-xl font-black text-slate-700 mt-0.5">{completedCount}</div>
=======

        <div
          onClick={() => setStatusFilter('completed')}
          className={`bg-white border rounded-2xl p-3.5 shadow-sm cursor-pointer transition hover:border-purple-400 ${statusFilter === 'completed' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200/80'
            }`}
        >
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Completed</div>
          <div className="text-2xl font-black text-slate-700 mt-0.5">{completedCount}</div>
>>>>>>> Stashed changes
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by venue, sport, player, or join code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="live">🔴 Live Now</option>
              <option value="created">⏳ Scheduled / Created</option>
              <option value="completed">✓ Completed</option>
              <option value="cancelled">✕ Cancelled</option>
            </select>

            {/* Sport Filter */}
            {sportsList.length > 0 && (
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="all">All Sports</option>
                {sportsList.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            )}

            {/* Per Page Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-1">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value={6}>6</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active filter pills / indicators */}
        {(statusFilter !== 'all' || sportFilter !== 'all' || search) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
                Search: "{search}"
                <button onClick={() => setSearch('')} className="hover:text-red-500">
                  <X size={11} />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('all')} className="hover:text-red-500">
                  <X size={11} />
                </button>
              </span>
            )}
            {sportFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
                Sport: {sportFilter}
                <button onClick={() => setSportFilter('all')} className="hover:text-red-500">
                  <X size={11} />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setSportFilter('all');
              }}
              className="text-[11px] text-red-600 hover:underline font-bold ml-1"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 text-center text-slate-500 bg-white border border-slate-200/80 rounded-3xl shadow-sm">
          <Loader2 size={28} className="animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs font-semibold text-slate-600">Loading match scorecards...</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Fetching live data from platform database</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6">
          <Trophy size={36} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-900 font-black text-base">
            {matches.length === 0 ? 'No Matches Created Yet' : 'No Matches Matching Filters'}
          </h3>
          <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
            {matches.length === 0
<<<<<<< Updated upstream
              ? 'Community cricket and turf matches created by registered players will show up here.'
              : 'Try clearing your search terms or filters to view all available matches.'}
          </p>
          {(statusFilter !== 'all' || sportFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setSportFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              Clear All Filters
            </button>
          )}
=======
              ? 'Community matches created by registered players will show up here.'
              : 'Try clearing your search terms or filters to view all available matches.'}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            {(statusFilter !== 'all' || sportFilter !== 'all' || search) && (
              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setSportFilter('all');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
              >
                Clear All Filters
              </button>
            )}
          </div>
>>>>>>> Stashed changes
        </div>
      ) : (
        <>
          {/* Matches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentMatches.map((m) => {
              const status = (m.status || 'created').toLowerCase();
<<<<<<< Updated upstream
              return (
                <div
                  key={m.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
=======
              const inn = m.innings || m.scorecard?.innings || [];
              const tA = inn[0] || { runs: 0, wickets: 0, overs: '0.0' };
              const tB = inn[1] || { runs: 0, wickets: 0, overs: '0.0' };
              const tAName = m.teams?.A?.name || 'Team A';
              const tBName = m.teams?.B?.name || 'Team B';

              const resText = (m.resultText || m.result || '').trim();
              const resLower = resText.toLowerCase();
              const isCompleted = status === 'completed';
              const isLive = status === 'live';

              const isAWinner = isCompleted && (
                resLower.includes((tAName || '').toLowerCase()) ||
                resLower.includes('team a won') ||
                (Number(tA.runs || 0) > Number(tB.runs || 0) && !resLower.includes('team b won'))
              );
              const isBWinner = isCompleted && (
                resLower.includes((tBName || '').toLowerCase()) ||
                resLower.includes('team b won') ||
                (Number(tB.runs || 0) > Number(tA.runs || 0) && !resLower.includes('team a won'))
              );

              const isABatting = isLive && (m.currentInningsIndex === 0 || !m.currentInningsIndex);
              const isBBatting = isLive && m.currentInningsIndex === 1;

              const accent = isLive ? 'bg-emerald-500' : isCompleted ? 'bg-blue-500' : 'bg-amber-400';
              const statusPill = isLive
                ? 'text-emerald-700 bg-emerald-50 ring-emerald-600/20'
                : isCompleted
                  ? 'text-blue-700 bg-blue-50 ring-blue-600/20'
                  : 'text-amber-700 bg-amber-50 ring-amber-600/20';
              const dotColor = isLive ? 'bg-emerald-500' : isCompleted ? 'bg-blue-500' : 'bg-amber-500';

              const TeamRow = ({ letter, name, score, isWinner, isBatting }) => (
                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isWinner
                          ? 'bg-emerald-600 text-white'
                          : isBatting
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/30'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      {letter}
                    </span>
                    <span
                      className={`truncate text-[13px] ${isWinner ? 'font-bold text-slate-900' : isCompleted ? 'font-medium text-slate-500' : 'font-semibold text-slate-800'
                        }`}
                    >
                      {name}
                    </span>
                    {isBatting && <span className="text-[11px] shrink-0" title="Batting">🏏</span>}
                    {isWinner && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                        Won
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 shrink-0 tabular-nums">
                    <span
                      className={`text-lg leading-none font-black tracking-tight ${isWinner || isBatting ? 'text-slate-900' : isCompleted ? 'text-slate-400' : 'text-slate-800'
                        }`}
                    >
                      {score.runs ?? 0}
                      <span className="text-slate-300 font-medium">/</span>
                      {score.wickets ?? 0}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 w-14 text-right">{score.overs || '0.0'} ov</span>
                  </div>
                </div>
              );

              return (
                <div
                  key={m.id}
                  className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)] hover:border-slate-300 transition-all duration-200 overflow-hidden flex flex-col"
>>>>>>> Stashed changes
                >
                  {/* Status accent line */}
                  <div className={`h-[3px] w-full ${accent}`} />

                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    {/* Top row: sport / schedule + status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 text-[11px] font-semibold text-slate-500">
                        <span className="uppercase tracking-wider text-slate-700 font-extrabold">{m.sport || 'Cricket'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 truncate">
                          <Calendar size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate">{[m.matchDate, m.matchTime].filter(Boolean).join(' · ') || 'Date not set'}</span>
                        </span>
                      </div>
                      <span
<<<<<<< Updated upstream
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${
                          status === 'live'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                            : status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
=======
                        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${statusPill}`}
>>>>>>> Stashed changes
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          {isLive && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-70`} />}
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`} />
                        </span>
                        {status}
                      </span>
                    </div>

<<<<<<< Updated upstream
                    {/* Match Details Panel */}
                    <div className="bg-slate-50/80 rounded-xl p-3 text-xs space-y-2 border border-slate-100">
                      {/* Join Code */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-slate-500 font-medium">
                          <Key size={13} className="text-amber-500 mr-1.5" />
                          <span>Join Code:</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 tracking-wider">
                            {m.joinCode || 'N/A'}
                          </span>
                          {m.joinCode && (
                            <button
                              onClick={() => handleCopyCode(m.joinCode)}
                              title="Copy code"
                              className="p-1 text-slate-400 hover:text-emerald-600 transition"
                            >
                              {copiedCode === m.joinCode ? (
                                <Check size={13} className="text-emerald-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Players */}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center text-slate-500 font-medium">
                          <Users size={13} className="text-blue-500 mr-1.5" />
                          <span>Players Joined:</span>
                        </span>
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {m.players?.length || 1} players
                        </span>
                      </div>

                      {/* Toss Result */}
                      {m.toss && (
                        <div className="flex items-center justify-between text-slate-800 pt-1.5 border-t border-slate-200/60">
                          <span className="flex items-center text-slate-500 font-medium">
                            <Coins size={13} className="mr-1.5 text-amber-500" />
                            <span>Toss:</span>
                          </span>
                          <span className="font-bold text-[11px] text-slate-900 truncate max-w-[150px]">
                            {m.toss.winner} chose {m.toss.decision}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer / ID */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono truncate max-w-[140px]">ID: {m.id}</span>
                    <span>
                      {m.playWithStrangers ? (
                        <span className="text-emerald-600 font-semibold">Public Match</span>
                      ) : (
                        <span className="text-slate-500 font-semibold">Private</span>
                      )}
                    </span>
=======
                    {/* Title */}
                    <div className="mt-3">
                      <h3 className="text-[15px] font-extrabold text-slate-900 leading-snug line-clamp-1">
                        {m.place || m.turf?.name || 'Turf Venue'}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Hosted by <span className="font-semibold text-slate-700">{m.creatorName || 'Player'}</span>
                        <span className="text-slate-300 mx-1.5">•</span>
                        <span className="font-mono">{m.overs ? `${m.overs} ov` : '6 ov'}</span>
                      </p>
                    </div>

                    {/* Scoreboard (borderless, divided by hairline) */}
                    <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
                      <TeamRow letter="A" name={tAName} score={tA} isWinner={isAWinner} isBatting={isABatting} />
                      <TeamRow letter="B" name={tBName} score={tB} isWinner={isBWinner} isBatting={isBBatting} />
                    </div>

                    {/* Result / state line */}
                    <div className="mt-2.5 min-h-[20px] flex items-center gap-1.5 text-[12px]">
                      {isCompleted ? (
                        <>
                          <Trophy size={13} className="text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-700 truncate">
                            {resText || `${isAWinner ? tAName : isBWinner ? tBName : 'Match'} completed`}
                          </span>
                        </>
                      ) : isLive ? (
                        <>
                          <Radio size={13} className="text-emerald-600 shrink-0 animate-pulse" />
                          <span className="font-semibold text-emerald-700 truncate">
                            Inning {Number(m.currentInningsIndex || 0) + 1} in progress
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-500 truncate">
                            {m.toss?.decision
                              ? `Toss: ${m.toss.winner ? `${m.toss.winner} ` : ''}(${m.toss.decision})`
                              : 'Awaiting match start & toss'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Meta: join code · roster · toss (inline, no boxes) */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Key size={12} className="text-amber-500" />
                        <span className="font-mono font-bold text-slate-800 tracking-wider">{m.joinCode || 'N/A'}</span>
                        {m.joinCode && (
                          <button
                            onClick={(e) => handleCopyCode(m.joinCode, e)}
                            title="Copy join code"
                            className="p-0.5 text-slate-400 hover:text-emerald-600 transition"
                          >
                            {copiedCode === m.joinCode ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        )}
                      </span>
                      <span className="text-slate-200">|</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={12} className="text-slate-400" />
                        <span className="font-semibold text-slate-700">{m.players?.length || 1}</span> players
                      </span>
                      <span className="text-slate-200">|</span>
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <Coins size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[130px] font-medium text-slate-600">
                          {m.toss?.decision ? `${m.toss.winner ? `${m.toss.winner} ` : ''}(${m.toss.decision})` : 'Toss pending'}
                        </span>
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto pt-4"><div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => setCommandMatch(m)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                      >
                        <Activity size={13} />
                        <span>View Scorecard</span>
                        <ChevronRight size={13} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                      <button
                        onClick={(e) => handleQuickDelete(m, e)}
                        title="Delete match"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    </div>
>>>>>>> Stashed changes
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
            {/* Range info */}
            <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
              Showing <strong className="text-slate-900 font-bold">{totalItems === 0 ? 0 : startIndex + 1}</strong> to{' '}
              <strong className="text-slate-900 font-bold">{endIndex}</strong> of{' '}
              <strong className="text-slate-900 font-bold">{totalItems}</strong> matches
            </div>

            {/* Page Buttons */}
            <div className="flex items-center space-x-1.5">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage === 1}
                title="First Page"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronsLeft size={15} />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage === 1}
                title="Previous Page"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((num, idx) => {
                  if (num === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-bold">
                        ...
                      </span>
                    );
                  }
                  const isActive = validCurrentPage === num;
                  return (
                    <button
                      key={num}
                      onClick={() => setCurrentPage(num)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center ${isActive
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-extrabold'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage === totalPages}
                title="Next Page"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight size={15} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage === totalPages}
                title="Last Page"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}
<<<<<<< Updated upstream
=======

      {commandMatch && (
        <MatchDetailModal
          match={commandMatch}
          onClose={() => setCommandMatch(null)}
          onUpdated={handleMatchUpdatedFromModal}
        />
      )}
>>>>>>> Stashed changes
    </div>
  );
};
