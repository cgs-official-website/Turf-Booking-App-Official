import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import { useModal } from '../context/ModalContext';
import {
  Trophy,
  Radio,
  Users,
  History,
  Search,
  RotateCw,
  Calendar,
  MapPin,
  Building2,
  Phone,
  Mail,
  User,
  Medal,
  ChevronRight,
  X,
  Swords,
  Shield,
  Clock,
  CheckCircle2,
  Flame,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const TournamentsView = () => {
  const { showAlert } = useModal();

  // Primary data states
  const [tournaments, setTournaments] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, live: 0, completed: 0 });

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'live' | 'upcoming' | 'completed'

  // Section 2: Selected Tournament for Participants view
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [participantDetail, setParticipantDetail] = useState(null);
  const [participantLoading, setParticipantLoading] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');

  // Section 3: History Drawer state
  const [drawerTournament, setDrawerTournament] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 15-second polling timer state
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(15);

  const [connectionError, setConnectionError] = useState(null);

  /**
   * Fetch all tournaments and summary stats
   */
  const loadTournaments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);
    try {
      const [listRes, histRes] = await Promise.all([
        api.getAllTournaments({ status: statusFilter !== 'all' ? statusFilter : undefined, search: search.trim() || undefined }),
        api.getTournamentHistory({ search: search.trim() || undefined, limit: 50 }),
      ]);

      const tList = listRes.data?.tournaments || listRes.tournaments || [];
      const sStats = listRes.data?.stats || {
        total: tList.length,
        upcoming: tList.filter((t) => t.status === 'upcoming').length,
        live: tList.filter((t) => t.status === 'live').length,
        completed: tList.filter((t) => t.status === 'completed').length,
      };

      setTournaments(tList);
      setStats(sStats);
      setConnectionError(null);

      const hList = histRes.data?.items || histRes.items || [];
      setHistoryList(hList);

      // Auto-select first available tournament for Participants section if none selected
      if (!selectedTournamentId && tList.length > 0) {
        setSelectedTournamentId(tList[0].id);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      const isConnError = (err.message || '').includes('Failed to fetch') || (err.message || '').includes('NetworkError');
      setConnectionError(
        isConnError
          ? 'Backend API server connection refused on port 5000. Ensure the server is running (npm --prefix server run dev).'
          : (err.message || 'Failed to load tournaments monitoring data.')
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setSecondsUntilRefresh(15);
    }
  }, [statusFilter, search, selectedTournamentId]);

  // Initial load and filter change trigger
  useEffect(() => {
    loadTournaments(false);
  }, [statusFilter, search]);

  /**
   * 15-second auto-polling loop
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          loadTournaments(true);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadTournaments]);

  /**
   * Load details for selected tournament in Section 2 (Participants)
   */
  useEffect(() => {
    if (!selectedTournamentId) {
      setParticipantDetail(null);
      return;
    }

    let isMounted = true;
    setParticipantLoading(true);

    api.getTournamentById(selectedTournamentId)
      .then((res) => {
        if (isMounted) {
          setParticipantDetail(res.data?.tournament || res.tournament || null);
        }
      })
      .catch((err) => {
        console.warn('Failed to load participant detail:', err.message);
      })
      .finally(() => {
        if (isMounted) setParticipantLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTournamentId]);

  // Handle ESC key to close history drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  /**
   * Filtered Live Tournaments
   */
  const liveTournaments = useMemo(() => {
    return tournaments.filter((t) => t.status === 'live');
  }, [tournaments]);

  /**
   * Filtered Participants List in Section 2
   */
  const filteredTeams = useMemo(() => {
    if (!participantDetail || !Array.isArray(participantDetail.teams)) return [];
    const q = participantSearch.trim().toLowerCase();
    if (!q) return participantDetail.teams;

    return participantDetail.teams.filter((team) => {
      const matchTeamName = (team.name || '').toLowerCase().includes(q);
      const matchCaptain = (team.captain?.name || team.captainName || '').toLowerCase().includes(q);
      const matchPlayers = (team.players || []).some((p) =>
        (typeof p === 'string' ? p : p.name || '').toLowerCase().includes(q)
      );
      return matchTeamName || matchCaptain || matchPlayers;
    });
  }, [participantDetail, participantSearch]);

  /**
   * Open Details Drawer for a completed tournament
   */
  const handleOpenDrawer = async (historyTournament) => {
    setDrawerTournament(historyTournament);
    setIsDrawerOpen(true);

    // Fetch full details with linked fixtures & standings
    try {
      const res = await api.getTournamentById(historyTournament.id);
      const full = res.data?.tournament || res.tournament;
      if (full) {
        setDrawerTournament(full);
      }
    } catch (err) {
      console.warn('Could not enrich drawer tournament:', err.message);
    }
  };

  return (
    <div className="space-y-6 select-text">
      {/* ─────────────────────────────────────────────────────────────
          TOP CONTROLS & HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Trophy className="w-6 h-6 text-[var(--theme-primary)]" />
            <span>Tournaments Command Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time live scores, team participant rosters, and tournament history archives.
          </p>
        </div>

        {/* Polling & Manual Refresh Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Polls in {secondsUntilRefresh}s</span>
          </div>

          <button
            onClick={() => loadTournaments(false)}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)]"
            title="Refresh Tournament Monitor"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[var(--theme-primary)] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Connection Offline Banner */}
      {connectionError && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{connectionError}</span>
          </div>
          <button
            onClick={() => loadTournaments(false)}
            className="px-3 py-1 font-bold text-xs bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tournaments, turf, sports, or teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)] transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All', count: stats.total },
            { id: 'live', label: 'Live Now', count: stats.live, isLive: true },
            { id: 'upcoming', label: 'Upcoming', count: stats.upcoming },
            { id: 'completed', label: 'Completed', count: stats.completed },
          ].map((chip) => {
            const isActive = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)] ${
                  isActive
                    ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary-text)] border border-[var(--theme-primary-border)] shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {chip.isLive && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--theme-primary)]" />
                  </span>
                )}
                <span>{chip.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: LIVE NOW (Cards with Live Scorecard & Match in Progress)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--theme-primary)]" />
            </span>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              1. Live Now — Matches In Progress
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              ({liveTournaments.length} {liveTournaments.length === 1 ? 'Tournament' : 'Tournaments'})
            </span>
          </div>

          <span className="text-[11px] font-medium text-slate-400">
            Auto-refreshing every 15s
          </span>
        </div>

        {liveTournaments.length === 0 ? (
          /* Empty State for Live Now */
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[var(--theme-primary)] mb-3">
              <Radio className="w-6 h-6 animate-pulse motion-reduce:animate-none" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Tournament Matches Live Right Now
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              When tournament matches begin and scores are updated ball-by-ball by match referees, live cards with real-time runs, overs, and toss results will broadcast here automatically.
            </p>
            <div className="mt-4">
              <button
                onClick={() => setStatusFilter('upcoming')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[var(--theme-primary-text)] bg-[var(--theme-primary-light)] hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-[var(--theme-primary-border)] rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)]"
              >
                <span>View Upcoming Tournaments</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Live Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveTournaments.map((tournament) => {
              const liveFixture = (tournament.fixtures || []).find(
                (f) => f.status === 'live' || f.matchData?.status === 'live'
              ) || (tournament.fixtures && tournament.fixtures[0]);

              const matchData = liveFixture?.matchData || tournament.currentLiveMatch || {};
              const sc = matchData.scorecard || {};
              const teamAName = liveFixture?.teamA?.name || matchData.teams?.teamA?.name || 'Team Alpha';
              const teamBName = liveFixture?.teamB?.name || matchData.teams?.teamB?.name || 'Team Beta';

              const isCricket = (tournament.sport || '').toLowerCase().includes('cricket');
              const isFootball = (tournament.sport || '').toLowerCase().includes('football');

              return (
                <div
                  key={tournament.id}
                  className="bg-white dark:bg-slate-900 border-2 border-emerald-500/40 dark:border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition motion-reduce:transition-none flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Top Live Accent Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

                  {/* Header: Tournament Title & Live Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-primary)] block">
                          {tournament.sport} Tournament
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                          {tournament.name}
                        </h3>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-500 text-white shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping motion-reduce:animate-none" />
                        Live
                      </span>
                    </div>

                    {/* Venue & Location Info */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {tournament.turf?.name || tournament.venueName || 'Turf Stadium'} • {tournament.turf?.city || tournament.city || 'Chennai'}
                      </span>
                    </div>

                    {/* Match In Progress Scoreboard Card */}
                    <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Swords className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                          Match in Progress
                        </span>
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {isFootball ? (sc.football?.half || 'In Play') : `Inning ${sc.currentInning || 1}`}
                        </span>
                      </div>

                      {/* Teams & Score Display */}
                      <div className="space-y-2">
                        {/* Team A */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                            {teamAName}
                          </span>
                          <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            {isCricket
                              ? `${sc.runs || 0} / ${sc.wickets || 0}`
                              : isFootball
                              ? (sc.football?.scoreA ?? sc.runs ?? 0)
                              : `${sc.runs || 0}`}
                          </span>
                        </div>

                        {/* Team B */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                            {teamBName}
                          </span>
                          <span className="text-sm font-black font-mono text-slate-600 dark:text-slate-300">
                            {isFootball
                              ? (sc.football?.scoreB ?? sc.wickets ?? 0)
                              : isCricket && sc.innings && sc.innings[1]
                              ? `${sc.innings[1].runs}/${sc.innings[1].wickets}`
                              : 'Yet to bat'}
                          </span>
                        </div>
                      </div>

                      {/* Cricket Overs & Details */}
                      {isCricket && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            Overs: <strong className="text-slate-900 dark:text-white font-mono">{sc.overs || 0}</strong>
                          </span>
                          {sc.striker && (
                            <span className="truncate max-w-[180px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ★ {sc.striker.split('(')[0]}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Football Minute & Scorers */}
                      {isFootball && sc.football?.minute && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            Match Minute: <strong className="text-slate-900 dark:text-white font-mono">{sc.football.minute}'</strong>
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {sc.football.scorers?.[0] || 'Active Play'}
                          </span>
                        </div>
                      )}

                      {/* Toss Result info */}
                      {matchData.toss?.wonBy && (
                        <div className="text-[10px] text-slate-400 italic">
                          Toss: {matchData.toss.wonBy} ({matchData.toss.decision || 'batted first'})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: View Participants quick switch */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {(tournament.teams || []).length} Teams Registered
                    </span>

                    <button
                      onClick={() => {
                        setSelectedTournamentId(tournament.id);
                        const el = document.getElementById('participants-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--theme-primary-text)] hover:text-[var(--theme-primary-hover)] transition focus-visible:outline-none focus-visible:underline"
                    >
                      <span>View Roster</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: PARTICIPANTS (Select Tournament -> Turf, Vendor, Teams, Captain & Rosters)
      ───────────────────────────────────────────────────────────── */}
      <section id="participants-section" className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--theme-primary)]" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                2. Participants & Team Rosters
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any tournament to inspect hosting turf venue, partner vendor contacts, and team player rosters.
            </p>
          </div>

          {/* Tournament Picker Dropdown */}
          <div className="w-full sm:w-72">
            <select
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)]"
            >
              <option value="" disabled>-- Select a Tournament --</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Tournament Overview & Venue Details */}
        {participantLoading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
            <RotateCw className="w-6 h-6 animate-spin text-[var(--theme-primary)] mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading tournament participants...</p>
          </div>
        ) : !participantDetail ? (
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Tournament Selected</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select a tournament from the dropdown above to display venue details and registered player rosters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Turf Venue & Vendor Profile Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Turf Info */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Host Turf Venue
                  </span>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />
                    <span>{participantDetail.turf?.name || participantDetail.venueName || 'Turf Arena'}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {typeof participantDetail.turf?.location === 'object'
                        ? participantDetail.turf.location?.address || participantDetail.turf.city || 'Chennai'
                        : participantDetail.turf?.location || participantDetail.venueLocation || participantDetail.turf?.city || 'Chennai'}
                    </span>
                  </div>
                </div>

                {/* Vendor Partner Info */}
                <div className="space-y-1 md:border-l md:border-slate-100 dark:md:border-slate-800 md:pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Partner Vendor
                  </span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{participantDetail.vendor?.name || participantDetail.vendorName || 'Partner Host'}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    {participantDetail.vendor?.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{participantDetail.vendor.phone}</span>
                      </div>
                    )}
                    {participantDetail.vendor?.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{participantDetail.vendor.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tournament Metadata Chips */}
                <div className="space-y-1 md:border-l md:border-slate-100 dark:md:border-slate-800 md:pl-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Tournament Window & Format
                    </span>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{participantDetail.startDate} to {participantDetail.endDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {participantDetail.sport}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md ${
                      participantDetail.status === 'live'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : participantDetail.status === 'completed'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    }`}>
                      {participantDetail.status}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {filteredTeams.length} Teams
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Teams Roster Filter & List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Registered Teams & Rosters ({filteredTeams.length})
                </h3>

                <div className="relative w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search teams or players..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)]"
                  />
                </div>
              </div>

              {filteredTeams.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-xs">
                  <p className="text-xs text-slate-500">
                    {participantSearch ? 'No teams match your search query.' : 'No teams have registered for this tournament yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTeams.map((team, idx) => {
                    const captainName = team.captain?.name || team.captainName || 'Not Assigned';
                    const captainPhone = team.captain?.phone || team.captainPhone || '—';
                    const playersList = Array.isArray(team.players) ? team.players : [];

                    return (
                      <div
                        key={team.teamId || team.id || idx}
                        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Team Name Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[var(--theme-primary)] flex items-center justify-center font-black text-xs">
                                {idx + 1}
                              </span>
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[180px]">
                                {team.name}
                              </h4>
                            </div>

                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {playersList.length} Players
                            </span>
                          </div>

                          {/* Captain Info Box */}
                          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-2.5 mb-3 text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Team Captain
                            </span>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-amber-500" />
                              <span>{captainName}</span>
                            </div>
                            {captainPhone !== '—' && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{captainPhone}</span>
                              </div>
                            )}
                          </div>

                          {/* Player Roster */}
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                              Player Roster
                            </span>
                            {playersList.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">Roster pending submission</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {playersList.map((player, pIdx) => {
                                  const pName = typeof player === 'string' ? player : (player.name || `Player ${pIdx + 1}`);
                                  const pRole = typeof player === 'object' && player.role ? player.role : null;
                                  return (
                                    <span
                                      key={player.id || pIdx}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                                      title={pRole ? `${pName} (${pRole})` : pName}
                                    >
                                      <span>{pName}</span>
                                      {pRole && (
                                        <span className="text-[9px] text-slate-400">
                                          • {pRole.split(' ')[0]}
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: HISTORY (Table of Completed Tournaments & Details Drawer)
      ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3.5 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--theme-primary)]" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              3. Tournament History & Archives
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              ({historyList.length} Completed)
            </span>
          </div>

          <span className="text-xs text-slate-500">
            Archived results and official scores
          </span>
        </div>

        {historyList.length === 0 ? (
          /* Empty State for History */
          <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Completed Tournaments in Archive
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              When tournaments finish and champions are crowned, completed records with final scores, winners, runners-up, and match fixtures will appear here for audit and reporting.
            </p>
          </div>
        ) : (
          /* Table of Completed Tournaments */
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Tournament</th>
                  <th className="py-3 px-4">Winner</th>
                  <th className="py-3 px-4">Runner-Up</th>
                  <th className="py-3 px-4">Final Score</th>
                  <th className="py-3 px-4">Host Turf Venue</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {historyList.map((item) => {
                  const winnerName = typeof item.winner === 'string' ? item.winner : (item.winner?.name || 'TBD');
                  const runnerUpName = typeof item.runnerUp === 'string' ? item.runnerUp : (item.runnerUp?.name || 'TBD');

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition motion-reduce:transition-none"
                    >
                      {/* Tournament Name & Sport */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                          <div>
                            <span>{item.name}</span>
                            <span className="block text-[10px] font-medium text-slate-400">
                              {item.sport} • {(item.teams || []).length} Teams
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Winner */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold">
                          <Medal className="w-3.5 h-3.5 text-amber-500" />
                          <span>{winnerName}</span>
                        </span>
                      </td>

                      {/* Runner-Up */}
                      <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-slate-400">🥈</span>
                          <span>{runnerUpName}</span>
                        </span>
                      </td>

                      {/* Final Score */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {item.finalScore || '—'}
                      </td>

                      {/* Turf Venue */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {item.turf?.name || item.venueName || 'Turf Venue'}
                          </span>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                        {item.startDate && item.endDate
                          ? `${item.startDate} to ${item.endDate}`
                          : item.startDate || '—'}
                      </td>

                      {/* Action Button: View Details Drawer */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDrawer(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--theme-primary-text)] bg-[var(--theme-primary-light)] hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-[var(--theme-primary-border)] rounded-xl transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)]"
                        >
                          <span>View details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          "VIEW DETAILS" SLIDE-OVER DRAWER (Completed Tournament Fixtures & Standings)
      ───────────────────────────────────────────────────────────── */}
      {isDrawerOpen && drawerTournament && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Slide-over Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-screen max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col select-text">
              {/* Drawer Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/80 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-primary)] block">
                    Tournament Archive • {drawerTournament.sport}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {drawerTournament.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {drawerTournament.turf?.name || drawerTournament.venueName || 'Turf Venue'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {drawerTournament.startDate} to {drawerTournament.endDate}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)]"
                  title="Close Details Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body (Scrollable) */}
              <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6">
                {/* Winner & Final Score Highlight Banner */}
                <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Tournament Champion
                      </span>
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {typeof drawerTournament.winner === 'string'
                        ? drawerTournament.winner
                        : drawerTournament.winner?.name || 'Champion Team'}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Runner-Up: <strong className="text-slate-900 dark:text-white font-bold">{typeof drawerTournament.runnerUp === 'string' ? drawerTournament.runnerUp : drawerTournament.runnerUp?.name || 'Runner Up Team'}</strong>
                    </div>
                  </div>

                  <div className="sm:text-right bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-amber-500/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Grand Final Score
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                      {drawerTournament.finalScore || 'Final completed'}
                    </span>
                  </div>
                </div>

                {/* Sub-section: Fixtures & Match Results */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-[var(--theme-primary)]" />
                      <span>All Fixtures & Match Results ({(drawerTournament.fixtures || []).length})</span>
                    </h4>
                  </div>

                  {(!drawerTournament.fixtures || drawerTournament.fixtures.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No fixtures recorded for this tournament.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {drawerTournament.fixtures.map((fixture, fIdx) => {
                        const mData = fixture.matchData || {};
                        const sc = mData.scorecard || {};
                        const resultText = fixture.result || mData.result || sc.result || 'Match Completed';

                        return (
                          <div
                            key={fixture.id || fixture.matchId || fIdx}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                              <span>
                                {fixture.scheduledAt ? new Date(fixture.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Scheduled'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {fixture.status || 'completed'}
                              </span>
                            </div>

                            {/* Teams & Scores */}
                            <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                              <span className="text-sm">{fixture.teamA?.name || 'Team A'}</span>
                              <span className="text-xs text-slate-400 font-normal px-2">vs</span>
                              <span className="text-sm text-right">{fixture.teamB?.name || 'Team B'}</span>
                            </div>

                            {/* Outcome Result Text */}
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {resultText}
                              </span>

                              {mData.scorecard?.runs !== undefined && (
                                <span className="font-mono text-slate-500">
                                  {mData.scorecard.runs}/{mData.scorecard.wickets || 0} ({mData.scorecard.overs || 0} ov)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sub-section: Final Standings Table */}
                {Array.isArray(drawerTournament.standings) && drawerTournament.standings.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span>Final Standings</span>
                    </h4>

                    <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="py-2.5 px-3">Pos</th>
                            <th className="py-2.5 px-3">Team</th>
                            <th className="py-2.5 px-2 text-center">P</th>
                            <th className="py-2.5 px-2 text-center">W</th>
                            <th className="py-2.5 px-2 text-center">L</th>
                            <th className="py-2.5 px-2 text-center">T</th>
                            <th className="py-2.5 px-3 text-right">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {drawerTournament.standings.map((team, sIdx) => (
                            <tr key={team.teamId || sIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="py-2 px-3 font-bold text-slate-500">{sIdx + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{team.name}</td>
                              <td className="py-2 px-2 text-center font-mono text-slate-600 dark:text-slate-400">{team.played}</td>
                              <td className="py-2 px-2 text-center font-mono font-bold text-emerald-600">{team.won}</td>
                              <td className="py-2 px-2 text-center font-mono text-rose-500">{team.lost}</td>
                              <td className="py-2 px-2 text-center font-mono text-slate-400">{team.tied}</td>
                              <td className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">{team.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex justify-end">
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-accent-ring)]"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
