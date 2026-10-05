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

export const MatchesView = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

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
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Matches</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{matches.length}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Matches</span>
          </div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">{liveCount}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Scheduled</div>
          <div className="text-xl font-black text-slate-800 mt-0.5">{createdCount}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</div>
          <div className="text-xl font-black text-slate-700 mt-0.5">{completedCount}</div>
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
        </div>
      ) : (
        <>
          {/* Matches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentMatches.map((m) => {
              const status = (m.status || 'created').toLowerCase();
              return (
                <div
                  key={m.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-extrabold rounded-md uppercase tracking-wide">
                            {m.sport || 'Cricket'}
                          </span>
                          {(m.matchDate || m.matchTime) && (
                            <span className="inline-flex items-center text-[10px] text-slate-500 font-medium">
                              <Calendar size={11} className="mr-1 text-slate-400" />
                              {m.matchDate} {m.matchTime ? `• ${m.matchTime}` : ''}
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-slate-900 text-sm mt-1.5 leading-snug line-clamp-1">
                          {m.place || m.turf?.name || 'Turf Venue'}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          Organized by: <strong className="text-emerald-700 font-bold">{m.creatorName || 'Player'}</strong>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${
                          status === 'live'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                            : status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>}
                        {status}
                      </span>
                    </div>

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
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                        isActive
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
    </div>
  );
};
