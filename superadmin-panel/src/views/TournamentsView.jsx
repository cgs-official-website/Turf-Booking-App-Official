import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useModal } from '../context/ModalContext';
import {
  Trophy,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Users,
  Coins,
  Award,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  Mail,
  FileText,
  Sparkles,
  Play,
  RotateCcw,
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

const FORMAT_OPTIONS = [
  { value: 'knockout', label: 'Knockout (Single Elimination)' },
  { value: 'round_robin', label: 'Round Robin (League)' },
  { value: 'group_knockout', label: 'Group Stage + Knockout' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'league', label: 'Championship League' },
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
  const { showAlert, showConfirm } = useModal();

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [turfsList, setTurfsList] = useState([]);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const initialFormState = {
    name: '',
    description: '',
    sport: 'Cricket',
    customSport: '',
    turfId: '',
    venueName: '',
    city: '',
    startDate: '',
    endDate: '',
    registrationStartDate: '',
    registrationEndDate: '',
    entryFee: '0',
    prizePool: '0',
    firstPrize: '',
    secondPrize: '',
    thirdPrize: '',
    otherPrizes: '',
    participantCapacity: 16,
    format: 'knockout',
    rules: '',
    bannerUrl: '',
    status: 'draft',
    contactPhone: '',
    contactEmail: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});

  // Load Tournaments
  const loadTournaments = async () => {
    setLoading(true);
    try {
      const res = await api.getAllTournaments();
      const list = res.data?.tournaments || [];
      setTournaments(list);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      showAlert({
        title: 'Fetch Error',
        message: err.message || 'Failed to load tournaments.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load Turfs for venue selector
  const loadTurfs = async () => {
    try {
      const res = await api.getAllTurfs();
      const list = res.data?.items || res.data?.turfs || [];
      setTurfsList(list);
    } catch (err) {
      console.warn('Could not load turfs for dropdown:', err);
    }
  };

  useEffect(() => {
    loadTournaments();
    loadTurfs();
  }, []);

  // Filtered Tournaments
  const filteredTournaments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tournaments.filter((t) => {
      // Status filter
      if (statusFilter !== 'all' && (t.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Sport filter
      if (sportFilter !== 'all' && (t.sport || '').toLowerCase() !== sportFilter.toLowerCase()) {
        return false;
      }
      // Format filter
      if (formatFilter !== 'all' && (t.format || '').toLowerCase() !== formatFilter.toLowerCase()) {
        return false;
      }
      // Search query
      if (q) {
        const matchesQuery =
          (t.name || '').toLowerCase().includes(q) ||
          (t.sport || '').toLowerCase().includes(q) ||
          (t.venueName || '').toLowerCase().includes(q) ||
          (t.city || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.turf?.name || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [tournaments, search, statusFilter, sportFilter, formatFilter]);

  // Status counters
  const totalCount = tournaments.length;
  const publishedCount = tournaments.filter((t) => (t.status || '').toLowerCase() === 'published').length;
  const ongoingCount = tournaments.filter((t) => (t.status || '').toLowerCase() === 'ongoing').length;
  const draftCount = tournaments.filter((t) => (t.status || '').toLowerCase() === 'draft').length;
  const completedCount = tournaments.filter((t) => ['completed', 'cancelled'].includes((t.status || '').toLowerCase())).length;

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (t) => {
    setEditingId(t.id);
    const prizeDetails = t.prizeDetails || {};
    const isStandardSport = POPULAR_SPORTS.includes(t.sport);

    setFormData({
      name: t.name || '',
      description: t.description || '',
      sport: isStandardSport ? t.sport : 'Other',
      customSport: isStandardSport ? '' : t.sport || '',
      turfId: t.turfId || '',
      venueName: t.venueName || '',
      city: t.city || '',
      startDate: t.startDate || '',
      endDate: t.endDate || '',
      registrationStartDate: t.registrationStartDate || '',
      registrationEndDate: t.registrationEndDate || '',
      entryFee: t.entryFee !== undefined ? String(t.entryFee) : '0',
      prizePool: t.prizePool !== undefined ? String(t.prizePool) : '0',
      firstPrize: prizeDetails.firstPrize || '',
      secondPrize: prizeDetails.secondPrize || '',
      thirdPrize: prizeDetails.thirdPrize || '',
      otherPrizes: prizeDetails.otherPrizes || '',
      participantCapacity: t.participantCapacity || 16,
      format: t.format || 'knockout',
      rules: t.rules || '',
      bannerUrl: t.bannerUrl || '',
      status: t.status || 'draft',
      contactPhone: t.contactPhone || '',
      contactEmail: t.contactEmail || '',
    });
    setFormErrors({});
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (t) => {
    setSelectedTournament(t);
    setIsDetailOpen(true);
  };

  // Turf selection in form
  const handleTurfSelect = (selectedTurfId) => {
    if (!selectedTurfId) {
      setFormData((prev) => ({ ...prev, turfId: '' }));
      return;
    }
    const found = turfsList.find((x) => x.id === selectedTurfId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        turfId: found.id,
        venueName: found.name || prev.venueName,
        city: found.city || prev.city,
      }));
    }
  };

  // Validate form fields
  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Tournament name is required';
    const effectiveSport = formData.sport === 'Other' ? formData.customSport.trim() : formData.sport;
    if (!effectiveSport) errs.sport = 'Sport type is required';
    if (!formData.venueName.trim()) errs.venueName = 'Venue name is required';
    if (!formData.startDate) errs.startDate = 'Start date is required';
    if (!formData.endDate) errs.endDate = 'End date is required';
    if (!formData.registrationStartDate) errs.registrationStartDate = 'Registration start date is required';
    if (!formData.registrationEndDate) errs.registrationEndDate = 'Registration deadline is required';

    // Date range logic
    if (formData.startDate && formData.endDate) {
      const s = new Date(formData.startDate).getTime();
      const e = new Date(formData.endDate).getTime();
      if (s > e) {
        errs.endDate = 'Tournament end date must be on or after start date';
      }
    }

    if (formData.registrationStartDate && formData.registrationEndDate) {
      const rs = new Date(formData.registrationStartDate).getTime();
      const re = new Date(formData.registrationEndDate).getTime();
      if (rs > re) {
        errs.registrationEndDate = 'Registration deadline must be on or after registration opening date';
      }
    }

    if (formData.registrationEndDate && formData.startDate) {
      const re = new Date(formData.registrationEndDate).getTime();
      const s = new Date(formData.startDate).getTime();
      if (re > s) {
        errs.registrationEndDate = 'Registration deadline cannot exceed tournament start date';
      }
    }

    if (Number(formData.entryFee) < 0) {
      errs.entryFee = 'Entry fee cannot be negative';
    }

    if (parseInt(formData.participantCapacity, 10) < 2) {
      errs.participantCapacity = 'Participant capacity must be at least 2 teams';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Tournament (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showAlert({
        title: 'Validation Error',
        message: 'Please review and fix the highlighted fields before saving.',
        type: 'warning',
      });
      return;
    }

    setSaving(true);
    try {
      const effectiveSport = formData.sport === 'Other' ? formData.customSport.trim() : formData.sport;

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sport: effectiveSport,
        turfId: formData.turfId || null,
        venueName: formData.venueName.trim(),
        city: formData.city.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        registrationStartDate: formData.registrationStartDate,
        registrationEndDate: formData.registrationEndDate,
        entryFee: Number(formData.entryFee || 0),
        prizePool: Number(formData.prizePool || 0),
        prizeDetails: {
          firstPrize: formData.firstPrize.trim(),
          secondPrize: formData.secondPrize.trim(),
          thirdPrize: formData.thirdPrize.trim(),
          otherPrizes: formData.otherPrizes.trim(),
        },
        participantCapacity: parseInt(formData.participantCapacity, 10),
        format: formData.format,
        rules: formData.rules.trim(),
        bannerUrl: formData.bannerUrl.trim(),
        status: formData.status,
        contactPhone: formData.contactPhone.trim(),
        contactEmail: formData.contactEmail.trim(),
      };

      if (editingId) {
        await api.updateTournament(editingId, payload);
      } else {
        await api.createTournament(payload);
      }

      setIsFormOpen(false);
      await showAlert({
        title: editingId ? 'Tournament Updated' : 'Tournament Created',
        message: `Tournament "${payload.name}" has been ${editingId ? 'updated' : 'published to the platform'} successfully!`,
        type: 'success',
      });
      loadTournaments();
    } catch (err) {
      showAlert({
        title: 'Save Failed',
        message: err.message || 'Failed to save tournament.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Change Status (Publish / Unpublish / Ongoing / Cancel)
  const handleStatusChange = async (t, newStatus) => {
    try {
      if (newStatus === 'cancelled') {
        const confirmed = await showConfirm({
          title: 'Cancel Tournament?',
          message: `Are you sure you want to mark tournament "${t.name}" as cancelled? This will notify players and stop registrations.`,
          type: 'danger',
          confirmText: 'Yes, Cancel Tournament',
        });
        if (!confirmed) return;
      }

      const res = await api.updateTournamentStatus(t.id, newStatus);
      if (res.success) {
        await showAlert({
          title: 'Status Updated',
          message: `Tournament "${t.name}" is now marked as ${newStatus.toUpperCase()}.`,
          type: 'success',
        });
        loadTournaments();
        if (selectedTournament && selectedTournament.id === t.id) {
          setSelectedTournament((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      showAlert({
        title: 'Update Failed',
        message: err.message || 'Failed to change tournament status.',
        type: 'error',
      });
    }
  };

  // Delete Tournament with Safeguard
  const handleDeleteTournament = async (t) => {
    try {
      const isOngoing = (t.status || '').toLowerCase() === 'ongoing';
      const confirmed = await showConfirm({
        title: 'Delete Tournament Permanently?',
        message: `Are you sure you want to permanently delete tournament "${t.name}"?\n\n${
          isOngoing
            ? '⚠️ WARNING: This tournament is marked as ONGOING. Deleting it will purge active tournament data permanently.'
            : 'This action is irreversible and will remove all prize details, rules, and schedules.'
        }`,
        type: 'danger',
        confirmText: 'Permanently Delete',
      });

      if (!confirmed) return;

      const res = await api.deleteTournament(t.id, isOngoing);
      if (res.success) {
        setIsDetailOpen(false);
        await showAlert({
          title: 'Tournament Deleted',
          message: `Tournament "${t.name}" has been successfully removed.`,
          type: 'success',
        });
        loadTournaments();
      }
    } catch (err) {
      showAlert({
        title: 'Delete Failed',
        message: err.message || 'Failed to delete tournament.',
        type: 'error',
      });
    }
  };

  // Badge Color Helper
  const getStatusBadge = (status) => {
    const s = (status || 'draft').toLowerCase();
    switch (s) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            PUBLISHED
          </span>
        );
      case 'ongoing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
            LIVE ONGOING
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            <CheckCircle2 size={11} />
            COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <XCircle size={11} />
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Clock size={11} />
            DRAFT
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-xs">
              <Trophy size={16} />
            </div>
            <span>Tournament Management & Leagues</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create, schedule, publish, and govern sports tournaments, entry fees, and prize pools across partner turfs.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={loadTournaments}
            disabled={loading}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:bg-slate-100 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 transition flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            title="Refresh Tournaments"
          >
            <RefreshCw size={13} className={`text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-500/25 flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Tournament</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Events
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Published</span>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{publishedCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Live Ongoing
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{ongoingCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Drafts
          </div>
          <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">{draftCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Finished/Closed
          </div>
          <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5">{completedCount}</div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tournament, sport, venue, or city..."
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
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
              <option value="ongoing">Live Ongoing</option>
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

            {/* Format Filter */}
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Formats</option>
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
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

      {/* Main Tournaments Content Area */}
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
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            {search || statusFilter !== 'all' || sportFilter !== 'all'
              ? 'No tournaments match your current filters. Try resetting the search or filters.'
              : 'There are no tournaments in the platform yet. Create your first championship now.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-500/25 inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>Create First Tournament</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTournaments.map((t) => {
            const prize = t.prizePool ? Number(t.prizePool) : 0;
            const fee = t.entryFee ? Number(t.entryFee) : 0;
            const isPublished = (t.status || '').toLowerCase() === 'published';
            const isDraft = (t.status || '').toLowerCase() === 'draft';
            const isOngoing = (t.status || '').toLowerCase() === 'ongoing';

            return (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between group"
              >
                {/* Card Header & Banner */}
                <div>
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
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20 shadow-xs">
                        {t.sport || 'Sports'}
                      </span>
                      {getStatusBadge(t.status)}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm tracking-tight leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {t.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin size={12} className="text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {t.venueName}
                          {t.city ? `, ${t.city}` : ''}
                        </span>
                      </p>
                    </div>

                    {/* Timeline & Schedule Pill */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 space-y-1.5 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar size={12} className="text-slate-400" />
                          Dates:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatDate(t.startDate)} - {formatDate(t.endDate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                          <Clock size={12} className="text-slate-400" />
                          Reg Deadline:
                        </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatDate(t.registrationEndDate)}
                        </span>
                      </div>
                    </div>

                    {/* Metric Pills */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                        <div className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                          Prize Pool
                        </div>
                        <div className="text-xs font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                          {prize > 0 ? `₹${prize.toLocaleString('en-IN')}` : 'Trophies'}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Entry Fee</div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
                          {fee > 0 ? `₹${fee.toLocaleString('en-IN')}` : 'FREE'}
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Capacity</div>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center gap-1">
                          <Users size={11} className="text-slate-400" />
                          <span>{t.participantCapacity || 16} Teams</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    {/* Status Toggle Button */}
                    {isDraft && (
                      <button
                        onClick={() => handleStatusChange(t, 'published')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1 cursor-pointer"
                        title="Publish Tournament"
                      >
                        <Play size={11} />
                        <span>Publish</span>
                      </button>
                    )}
                    {isPublished && (
                      <button
                        onClick={() => handleStatusChange(t, 'draft')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="Move to Draft"
                      >
                        <RotateCcw size={11} />
                        <span>Unpublish</span>
                      </button>
                    )}
                    {isPublished && (
                      <button
                        onClick={() => handleStatusChange(t, 'ongoing')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 cursor-pointer"
                        title="Mark as Live Ongoing"
                      >
                        <span>Start</span>
                      </button>
                    )}
                    {isOngoing && (
                      <button
                        onClick={() => handleStatusChange(t, 'completed')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold bg-purple-600 hover:bg-purple-700 text-white transition flex items-center gap-1 cursor-pointer"
                        title="Mark as Completed"
                      >
                        <span>Finish</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenDetail(t)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                      title="View Details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Edit Tournament"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteTournament(t)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Delete Tournament"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Tournament</th>
                  <th className="py-3 px-4">Sport & Format</th>
                  <th className="py-3 px-4">Venue & City</th>
                  <th className="py-3 px-4">Event Dates</th>
                  <th className="py-3 px-4">Reg Deadline</th>
                  <th className="py-3 px-4">Fee / Prize</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs font-semibold">
                {filteredTournaments.map((t) => {
                  const prize = t.prizePool ? Number(t.prizePool) : 0;
                  const fee = t.entryFee ? Number(t.entryFee) : 0;
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
                          Capacity: {t.participantCapacity || 16} Teams
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {t.sport}
                        </span>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">
                          {t.format || 'Knockout'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-800 dark:text-slate-200 truncate font-bold">{t.venueName}</div>
                        <div className="text-[10px] text-slate-400">{t.city || 'Tamil Nadu'}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {formatDate(t.startDate)} - {formatDate(t.endDate)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
                        {formatDate(t.registrationEndDate)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                          {prize > 0 ? `₹${prize.toLocaleString('en-IN')} Pool` : 'Trophies'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {fee > 0 ? `Fee: ₹${fee}` : 'Free Entry'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(t.status)}</td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenDetail(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTournament(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT TOURNAMENT MODAL */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden scale-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-xs">
                  <Trophy size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {editingId ? 'Edit Tournament Details' : 'Create New Tournament'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Fill out all details, registration schedule, prizes, and venue rules.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* SECTION 1: BASIC INFORMATION */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-emerald-500" />
                  <span>1. Basic Tournament Details</span>
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tournament Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Coimbatore Super 7s Football Cup 2026"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      formErrors.name
                        ? 'border-rose-400 ring-rose-400/20'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sport / Game <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.sport}
                      onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {POPULAR_SPORTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {formData.sport === 'Other' && (
                      <input
                        type="text"
                        placeholder="Specify sport name..."
                        value={formData.customSport}
                        onChange={(e) => setFormData({ ...formData, customSport: e.target.value })}
                        className="w-full mt-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Format <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.format}
                      onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {FORMAT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description & Overview
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short highlight for prospective participating teams and audience..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Banner / Poster URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or Cloudinary URL"
                    value={formData.bannerUrl}
                    onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* SECTION 2: VENUE & PLATFORM INTEGRATION */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <MapPin size={12} className="text-emerald-500" />
                  <span>2. Venue & Facility Selection</span>
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Link with Registered Partner Turf (Optional)
                  </label>
                  <select
                    value={formData.turfId}
                    onChange={(e) => handleTurfSelect(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">-- Custom Venue / External Ground --</option>
                    {turfsList.map((turf) => (
                      <option key={turf.id} value={turf.id}>
                        {turf.name} {turf.city ? `(${turf.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Venue / Ground Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arena Turf Court 1"
                      value={formData.venueName}
                      onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {formErrors.venueName && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.venueName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      City / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Coimbatore, Erode, Chennai"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: DATES & REGISTRATION TIMELINE */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Calendar size={12} className="text-emerald-500" />
                  <span>3. Tournament Schedule & Registration Window</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tournament Start Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {formErrors.startDate && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.startDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tournament End Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {formErrors.endDate && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1">{formErrors.endDate}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Registration Opening Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.registrationStartDate}
                      onChange={(e) => setFormData({ ...formData, registrationStartDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {formErrors.registrationStartDate && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1">
                        {formErrors.registrationStartDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Registration Closing Deadline <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.registrationEndDate}
                      onChange={(e) => setFormData({ ...formData, registrationEndDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {formErrors.registrationEndDate && (
                      <p className="text-[10px] text-rose-500 font-bold mt-1">
                        {formErrors.registrationEndDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4: FINANCIALS, PRIZES & CAPACITY */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Coins size={12} className="text-emerald-500" />
                  <span>4. Participation & Prize Pool</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Entry Fee (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="0 for Free"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Total Prize Pool (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50000"
                      value={formData.prizePool}
                      onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Participant Capacity <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="2"
                      required
                      placeholder="16"
                      value={formData.participantCapacity}
                      onChange={(e) => setFormData({ ...formData, participantCapacity: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* Prize Breakdown Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      1st Prize (Winner)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹25,000 + Trophy"
                      value={formData.firstPrize}
                      onChange={(e) => setFormData({ ...formData, firstPrize: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      2nd Prize (Runner Up)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹12,000 + Silver Cup"
                      value={formData.secondPrize}
                      onChange={(e) => setFormData({ ...formData, secondPrize: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      3rd Prize / Semi-finalists
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹5,000"
                      value={formData.thirdPrize}
                      onChange={(e) => setFormData({ ...formData, thirdPrize: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Special Awards & Merits
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Man of the Match, Kit Bags, Medals"
                      value={formData.otherPrizes}
                      onChange={(e) => setFormData({ ...formData, otherPrizes: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: RULES, CONTACT & STATUS */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <FileText size={12} className="text-emerald-500" />
                  <span>5. Tournament Rules, Contact & Status</span>
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rules & Regulations
                  </label>
                  <textarea
                    rows={4}
                    placeholder={`1. Team squad size: 7 playing + 2 substitutes.\n2. Matches will be 6 overs per innings.\n3. Flat turf shoes only, no metal spikes allowed.\n4. Reporting time: 30 minutes before schedule.`}
                    value={formData.rules}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Organizer Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Organizer Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. cup@turf.com"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="draft">Draft (Private)</option>
                      <option value="published">Published (Live for Registration)</option>
                      <option value="ongoing">Live Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-500/25 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingId ? 'Update Tournament' : 'Publish Tournament'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW COMPLETE TOURNAMENT DETAILS MODAL */}
      {/* ========================================================================= */}
      {isDetailOpen && selectedTournament && (
        <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden scale-in-95 duration-200">
            {/* Header Banner */}
            <div className="h-40 bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 relative overflow-hidden flex items-end p-5 shrink-0">
              {selectedTournament.bannerUrl ? (
                <img
                  src={selectedTournament.bannerUrl}
                  alt={selectedTournament.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/40 to-transparent" />

              <div className="relative z-10 w-full flex items-end justify-between">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/20">
                    {selectedTournament.sport || 'Sports'}
                  </span>
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
              {/* Description */}
              {selectedTournament.description && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedTournament.description}
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                    Prize Pool
                  </div>
                  <div className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {Number(selectedTournament.prizePool || 0) > 0
                      ? `₹${Number(selectedTournament.prizePool).toLocaleString('en-IN')}`
                      : 'Trophies'}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Entry Fee
                  </div>
                  <div className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5">
                    {Number(selectedTournament.entryFee || 0) > 0
                      ? `₹${Number(selectedTournament.entryFee).toLocaleString('en-IN')}`
                      : 'FREE'}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Format
                  </div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 uppercase">
                    {selectedTournament.format || 'Knockout'}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Capacity
                  </div>
                  <div className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedTournament.participantCapacity || 16} Teams
                  </div>
                </div>
              </div>

              {/* Schedule Timeline */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Clock size={12} className="text-emerald-500" />
                  <span>Important Timeline & Milestones</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Registration Window
                    </span>
                    <p className="font-extrabold text-slate-800 dark:text-white mt-1">
                      {formatDate(selectedTournament.registrationStartDate)} &rarr;{' '}
                      <span className="text-amber-600 dark:text-amber-400">
                        {formatDate(selectedTournament.registrationEndDate)}
                      </span>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Tournament Play Dates
                    </span>
                    <p className="font-extrabold text-slate-800 dark:text-white mt-1">
                      {formatDate(selectedTournament.startDate)} &rarr;{' '}
                      {formatDate(selectedTournament.endDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Venue Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <MapPin size={12} className="text-emerald-500" />
                  <span>Venue Information</span>
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      {selectedTournament.venueName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedTournament.city || 'Tamil Nadu, India'}
                    </p>
                  </div>
                  {selectedTournament.turf && (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800">
                      Verified Platform Turf
                    </span>
                  )}
                </div>
              </div>

              {/* Prize Details */}
              {selectedTournament.prizeDetails && (
                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2.5">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Award size={12} />
                    <span>Prize Breakdown & Awards</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedTournament.prizeDetails.firstPrize && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60">
                        <span className="text-[10px] font-bold text-amber-600 block">1st Prize</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {selectedTournament.prizeDetails.firstPrize}
                        </span>
                      </div>
                    )}
                    {selectedTournament.prizeDetails.secondPrize && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 block">2nd Prize</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {selectedTournament.prizeDetails.secondPrize}
                        </span>
                      </div>
                    )}
                    {selectedTournament.prizeDetails.thirdPrize && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 block">3rd Prize</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {selectedTournament.prizeDetails.thirdPrize}
                        </span>
                      </div>
                    )}
                    {selectedTournament.prizeDetails.otherPrizes && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 block">Special Awards</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          {selectedTournament.prizeDetails.otherPrizes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rules & Guidelines */}
              {selectedTournament.rules && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <FileText size={12} className="text-emerald-500" />
                    <span>Tournament Rules & Regulations</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">
                    {selectedTournament.rules}
                  </p>
                </div>
              )}

              {/* Organizer Contact */}
              {(selectedTournament.contactPhone || selectedTournament.contactEmail) && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Phone size={12} className="text-emerald-500" />
                    <span>Organizer Contacts</span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                    {selectedTournament.contactPhone && (
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Phone size={13} className="text-emerald-600" />
                        {selectedTournament.contactPhone}
                      </span>
                    )}
                    {selectedTournament.contactEmail && (
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Mail size={13} className="text-emerald-600" />
                        {selectedTournament.contactEmail}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                {selectedTournament.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange(selectedTournament, 'published')}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play size={13} />
                    <span>Publish Event</span>
                  </button>
                )}
                {selectedTournament.status === 'published' && (
                  <button
                    onClick={() => handleStatusChange(selectedTournament, 'draft')}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Unpublish to Draft</span>
                  </button>
                )}
                {['draft', 'published', 'ongoing'].includes(selectedTournament.status) && (
                  <button
                    onClick={() => handleStatusChange(selectedTournament, 'cancelled')}
                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle size={13} />
                    <span>Cancel Tournament</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(selectedTournament)}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 size={13} />
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={() => handleDeleteTournament(selectedTournament)}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
