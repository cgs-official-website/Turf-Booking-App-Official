import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Trophy,
  X,
  Activity,
  Play,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  Key,
  Copy,
  Check,
  Trash2,
  Save,
  RefreshCw,
  Plus,
  Flame,
  Swords,
  ChevronRight,
  Shield,
  Coins,
  AlertCircle,
  Hash,
  MapPin,
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

export const MatchCommandModal = ({ match: initialMatch, onClose, onUpdated }) => {
  const { showAlert, showConfirm } = useModal();
  const [match, setMatch] = useState(initialMatch);
  const [activeTab, setActiveTab] = useState('scoreboard'); // 'scoreboard' | 'override' | 'roster' | 'settings'
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Score override state
  const teams = match.teams || {};
  const scorecard = match.scorecard || {};
  const innings = Array.isArray(match.innings) && match.innings.length > 0
    ? match.innings
    : (Array.isArray(scorecard.innings) && scorecard.innings.length > 0
      ? scorecard.innings
      : [
          { team: teams.A?.name || 'Team A', runs: 0, wickets: 0, overs: '0.0', balls: [] },
          { team: teams.B?.name || 'Team B', runs: 0, wickets: 0, overs: '0.0', balls: [] },
        ]);

  const [selectedInning, setSelectedInning] = useState(match.currentInningsIndex || 0);
  const currentInningData = innings[selectedInning] || {
    team: selectedInning === 0 ? (teams.A?.name || 'Team A') : (teams.B?.name || 'Team B'),
    runs: 0,
    wickets: 0,
    overs: '0.0',
    balls: [],
  };

  const [editRuns, setEditRuns] = useState(currentInningData.runs || 0);
  const [editWickets, setEditWickets] = useState(currentInningData.wickets || 0);
  const [editOvers, setEditOvers] = useState(String(currentInningData.overs || '0.0'));
  const [editStriker, setEditStriker] = useState(scorecard.striker || '');
  const [editNonStriker, setEditNonStriker] = useState(scorecard.nonStriker || '');
  const [editBowler, setEditBowler] = useState(scorecard.bowler || '');
  const [editResultText, setEditResultText] = useState(match.resultText || match.result || '');
  const [ballsHistory, setBallsHistory] = useState(currentInningData.balls || []);

  // Match settings state
  const [editPlace, setEditPlace] = useState(match.place || '');
  const [editDate, setEditDate] = useState(match.matchDate || '');
  const [editTime, setEditTime] = useState(match.matchTime || '');
  const [editSport, setEditSport] = useState(match.sport || 'Cricket');

  // Sync state whenever selected inning changes
  useEffect(() => {
    const inn = innings[selectedInning] || {
      team: selectedInning === 0 ? (teams.A?.name || 'Team A') : (teams.B?.name || 'Team B'),
      runs: 0,
      wickets: 0,
      overs: '0.0',
      balls: [],
    };
    setEditRuns(inn.runs || 0);
    setEditWickets(inn.wickets || 0);
    setEditOvers(String(inn.overs || '0.0'));
    setBallsHistory(inn.balls || []);
  }, [selectedInning]);

  // Copy join code
  const handleCopyCode = () => {
    if (!match.joinCode) return;
    navigator.clipboard.writeText(match.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Change Match Status (live, created, completed)
  const handleStatusChange = async (newStatus) => {
    setIsSaving(true);
    try {
      const res = await api.updateAdminMatch(match.id, { status: newStatus });
      if (res.success && res.data?.match) {
        setMatch(res.data.match);
        if (onUpdated) onUpdated(res.data.match);
        await showAlert({
          title: 'Status Updated',
          message: `Match status is now set to "${newStatus.toUpperCase()}".`,
          type: 'success',
        });
      }
    } catch (err) {
      await showAlert({
        title: 'Update Failed',
        message: err.message || 'Could not update match status',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add ball to current inning
  const handleAddBall = (event) => {
    const updatedBalls = [...ballsHistory, event];
    setBallsHistory(updatedBalls);

    // Auto adjust runs and wickets based on ball
    if (event === 'W') {
      setEditWickets((w) => Math.min(10, Number(w) + 1));
    } else if (event === '1') {
      setEditRuns((r) => Number(r) + 1);
    } else if (event === '2') {
      setEditRuns((r) => Number(r) + 2);
    } else if (event === '3') {
      setEditRuns((r) => Number(r) + 3);
    } else if (event === '4') {
      setEditRuns((r) => Number(r) + 4);
    } else if (event === '6') {
      setEditRuns((r) => Number(r) + 6);
    } else if (event === 'Wd' || event === 'Nb') {
      setEditRuns((r) => Number(r) + 1);
    }
  };

  // Save Scorecard Override
  const handleSaveScorecard = async () => {
    setIsSaving(true);
    try {
      const updatedInnings = [...innings];
      const targetTeamName = selectedInning === 0
        ? (teams.A?.name || 'Team A')
        : (teams.B?.name || 'Team B');

      updatedInnings[selectedInning] = {
        team: targetTeamName,
        runs: Number(editRuns),
        wickets: Number(editWickets),
        overs: String(editOvers),
        balls: ballsHistory,
      };

      const updatedScorecard = {
        ...scorecard,
        innings: updatedInnings,
        currentInning: selectedInning,
        currentInningsIndex: selectedInning,
        striker: editStriker,
        nonStriker: editNonStriker,
        bowler: editBowler,
        resultText: editResultText,
        result: editResultText,
      };

      const res = await api.updateAdminMatch(match.id, {
        scorecard: updatedScorecard,
      });

      if (res.success && res.data?.match) {
        setMatch(res.data.match);
        if (onUpdated) onUpdated(res.data.match);
        await showAlert({
          title: 'Scorecard Updated',
          message: 'Official match scorecard and score statistics updated successfully.',
          type: 'success',
        });
      }
    } catch (err) {
      await showAlert({
        title: 'Save Failed',
        message: err.message || 'Failed to save scorecard',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save Match Settings (place, date, time, sport)
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await api.updateAdminMatch(match.id, {
        place: editPlace,
        matchDate: editDate,
        matchTime: editTime,
        sport: editSport,
      });

      if (res.success && res.data?.match) {
        setMatch(res.data.match);
        if (onUpdated) onUpdated(res.data.match);
        await showAlert({
          title: 'Fixture Updated',
          message: 'Match fixture details updated successfully.',
          type: 'success',
        });
      }
    } catch (err) {
      await showAlert({
        title: 'Update Failed',
        message: err.message || 'Could not update match settings',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Disband / Delete Match
  const handleDeleteMatch = async () => {
    const confirmed = await showConfirm({
      title: 'Disband & Delete Match',
      message: `Are you sure you want to delete match "${match.place || match.id}"? All scorecard logs and player rosters for this fixture will be permanently removed.`,
      type: 'danger',
      confirmText: 'Delete Match',
    });

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await api.deleteAdminMatch(match.id);
      if (res.success) {
        await showAlert({
          title: 'Match Removed',
          message: 'The match fixture has been disbanded and deleted from the platform.',
          type: 'success',
        });
        if (onUpdated) onUpdated(null, match.id);
        onClose();
      }
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.message || 'Failed to delete match',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const status = (match.status || 'created').toLowerCase();
  const teamAName = teams.A?.name || 'Team A';
  const teamBName = teams.B?.name || 'Team B';
  const teamAScore = innings[0] || { runs: 0, wickets: 0, overs: '0.0' };
  const teamBScore = innings[1] || { runs: 0, wickets: 0, overs: '0.0' };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden scale-in-95 duration-200">
        
        {/* Top Header & Match Identifier */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-md">
              <Trophy size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
                  {match.sport || 'Cricket'}
                </span>
                <span className="text-slate-400 text-xs font-mono font-medium truncate max-w-[150px]">
                  ID: {match.id}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 truncate max-w-[320px] sm:max-w-md">
                {match.place || 'Turf Arena Match'}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Join Code Capsule */}
            {match.joinCode && (
              <div className="hidden sm:flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                <Key size={12} className="text-amber-400" />
                <span className="text-slate-400 text-[11px] font-semibold">Code:</span>
                <span className="font-mono font-black text-white tracking-widest">{match.joinCode}</span>
                <button
                  onClick={handleCopyCode}
                  title="Copy Join Code"
                  className="p-1 hover:text-emerald-400 text-slate-400 transition"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Command Status Bar (One-click state command) */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              Current Match State:
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                status === 'live'
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 animate-pulse'
                  : status === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>}
              {status}
            </span>
          </div>

          {/* Quick Command Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handleStatusChange('live')}
              disabled={isSaving || status === 'live'}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                status === 'live'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 opacity-60 cursor-default'
                  : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 shadow-sm'
              }`}
            >
              <Flame size={12} className="text-emerald-600" />
              <span>Set LIVE</span>
            </button>

            <button
              onClick={() => handleStatusChange('completed')}
              disabled={isSaving || status === 'completed'}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                status === 'completed'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300 opacity-60 cursor-default'
                  : 'bg-white hover:bg-blue-50 text-blue-700 border border-slate-200 shadow-sm'
              }`}
            >
              <CheckCircle2 size={12} className="text-blue-600" />
              <span>Set COMPLETED</span>
            </button>

            <button
              onClick={() => handleStatusChange('created')}
              disabled={isSaving || status === 'created'}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                status === 'created'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 opacity-60 cursor-default'
                  : 'bg-white hover:bg-amber-50 text-amber-700 border border-slate-200 shadow-sm'
              }`}
            >
              <Clock size={12} className="text-amber-600" />
              <span>Reset Scheduled</span>
            </button>

            <button
              onClick={handleDeleteMatch}
              disabled={isDeleting}
              title="Disband and Delete Match"
              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition ml-2"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            onClick={() => setActiveTab('scoreboard')}
            className={`py-3 px-3 sm:px-4 text-xs font-black tracking-tight border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'scoreboard'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity size={14} />
            <span>Live Scoreboard</span>
          </button>

          <button
            onClick={() => setActiveTab('override')}
            className={`py-3 px-3 sm:px-4 text-xs font-black tracking-tight border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'override'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame size={14} className="text-amber-500" />
            <span>Score Command & Override</span>
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`py-3 px-3 sm:px-4 text-xs font-black tracking-tight border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'roster'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={14} />
            <span>Teams & Rosters ({match.players?.length || 1})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 sm:px-4 text-xs font-black tracking-tight border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin size={14} />
            <span>Fixture Details</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-5">
          
          {/* TAB 1: LIVE SCOREBOARD */}
          {activeTab === 'scoreboard' && (
            <div className="space-y-4">
              {/* Head-to-Head Banner */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-lg border border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-700/80">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar size={13} className="text-emerald-400" />
                    <span>{match.matchDate} • {match.matchTime}</span>
                  </span>
                  <span className="font-semibold text-slate-300">
                    Host: <span className="text-emerald-400 font-bold">{match.creatorName || 'Player'}</span>
                  </span>
                </div>

                {/* Score Grid: Team A vs Team B */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 items-center">
                  {/* Team A */}
                  <div className={`p-4 rounded-2xl border transition ${
                    selectedInning === 0
                      ? 'bg-slate-800/90 border-emerald-500/60 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-slate-800/40 border-slate-700/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                        {teamAName}
                      </span>
                      {selectedInning === 0 && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Batting Now
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline space-x-2 mt-2">
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {teamAScore.runs || 0}/{teamAScore.wickets || 0}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-400 font-bold">
                        ({teamAScore.overs || '0.0'} ov)
                      </span>
                    </div>
                    {Number(teamAScore.overs) > 0 && (
                      <div className="text-[11px] text-slate-400 mt-1">
                        Run Rate: <strong className="text-slate-200 font-bold">
                          {(Number(teamAScore.runs) / (parseFloat(teamAScore.overs) || 1)).toFixed(2)}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Team B */}
                  <div className={`p-4 rounded-2xl border transition ${
                    selectedInning === 1
                      ? 'bg-slate-800/90 border-emerald-500/60 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-slate-800/40 border-slate-700/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                        {teamBName}
                      </span>
                      {selectedInning === 1 && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Batting Now
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline space-x-2 mt-2">
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {teamBScore.runs || 0}/{teamBScore.wickets || 0}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-400 font-bold">
                        ({teamBScore.overs || '0.0'} ov)
                      </span>
                    </div>
                    {Number(teamBScore.overs) > 0 && (
                      <div className="text-[11px] text-slate-400 mt-1">
                        Run Rate: <strong className="text-slate-200 font-bold">
                          {(Number(teamBScore.runs) / (parseFloat(teamBScore.overs) || 1)).toFixed(2)}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Toss & Outcome Bar */}
                <div className="bg-slate-800/70 rounded-xl p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border border-slate-700/50">
                  <div className="flex items-center space-x-1.5 text-slate-300">
                    <Coins size={14} className="text-amber-400" />
                    <span>
                      {match.toss ? (
                        <>Toss: <strong className="text-white">{match.toss.winner}</strong> won and elected to <strong className="text-emerald-400">{match.toss.decision}</strong></>
                      ) : (
                        <span className="text-slate-400">Toss not recorded yet</span>
                      )}
                    </span>
                  </div>

                  {(match.resultText || match.result) && (
                    <div className="inline-flex items-center space-x-1.5 text-emerald-400 font-extrabold bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg text-xs">
                      <Trophy size={13} />
                      <span>{match.resultText || match.result}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Striker & Bowler info card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Current Batters
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                      <span>Striker *</span>
                      <span className="text-emerald-700 font-extrabold">{scorecard.striker || 'Not Assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                      <span>Non-Striker</span>
                      <span className="text-slate-600 font-bold">{scorecard.nonStriker || 'Not Assigned'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Current Bowler
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                      <span>Bowler</span>
                      <span className="text-blue-700 font-extrabold">{scorecard.bowler || 'Not Assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                      <span>Innings In Progress</span>
                      <span className="text-slate-600 font-bold">{selectedInning === 0 ? '1st Innings' : '2nd Innings'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Balls Timeline */}
              {ballsHistory.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Ball-by-Ball Timeline ({ballsHistory.length} deliveries logged)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ballsHistory.map((b, idx) => (
                      <span
                        key={idx}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${
                          b === 'W'
                            ? 'bg-rose-600 text-white'
                            : b === '4'
                            ? 'bg-blue-600 text-white'
                            : b === '6'
                            ? 'bg-emerald-600 text-white'
                            : b === 'Wd' || b === 'Nb'
                            ? 'bg-amber-500 text-white'
                            : b === '0'
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUPERADMIN SCORE OVERRIDE & COMMAND */}
          {activeTab === 'override' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Flame size={16} className="text-amber-500" />
                  <span>Command Center: Direct Scorecard Overrides</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Super Admin can correct runs, wickets, overs, and players in real time without waiting for mobile clients.
                </p>
              </div>

              {/* Inning Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600">Select Inning to Edit:</span>
                <button
                  type="button"
                  onClick={() => setSelectedInning(0)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                    selectedInning === 0
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  1st Inning ({teamAName})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInning(1)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                    selectedInning === 1
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  2nd Inning ({teamBName})
                </button>
              </div>

              {/* Core Score Steppers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Runs */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <label className="text-[11px] font-black uppercase text-slate-500 block mb-1.5">
                    Runs
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      value={editRuns}
                      onChange={(e) => setEditRuns(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* Quick Add Buttons */}
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 4, 6].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setEditRuns((r) => Number(r) + pts)}
                        className="flex-1 py-1 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-xs font-extrabold text-slate-700 transition"
                      >
                        +{pts}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wickets */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <label className="text-[11px] font-black uppercase text-slate-500 block mb-1.5">
                    Wickets
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={editWickets}
                      onChange={(e) => setEditWickets(Math.max(0, Math.min(10, Number(e.target.value))))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => setEditWickets((w) => Math.min(10, Number(w) + 1))}
                      className="flex-1 py-1 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-xs font-extrabold text-rose-700 transition"
                    >
                      +1 Wicket
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditWickets((w) => Math.max(0, Number(w) - 1))}
                      className="flex-1 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-extrabold text-slate-700 transition"
                    >
                      -1
                    </button>
                  </div>
                </div>

                {/* Overs */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <label className="text-[11px] font-black uppercase text-slate-500 block mb-1.5">
                    Overs (e.g. 5.4)
                  </label>
                  <input
                    type="text"
                    value={editOvers}
                    onChange={(e) => setEditOvers(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="text-[10px] text-slate-400 mt-2 font-medium">
                    Format: [completed_overs].[balls_in_over]
                  </div>
                </div>
              </div>

              {/* Quick Ball Buttons */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="text-[11px] font-black uppercase text-slate-500 block mb-2">
                  Quick Ball Feed (Appends to Timeline)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['0', '1', '2', '3', '4', '6', 'W', 'Wd', 'Nb'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleAddBall(b)}
                      className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition shadow-sm ${
                        b === 'W'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : b === '4'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : b === '6'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {b === 'W' ? '🔴 Wicket' : b === '4' ? 'FOUR (4)' : b === '6' ? 'SIX (6)' : b}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBallsHistory([])}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 bg-white border border-slate-200 ml-auto transition"
                  >
                    Clear Balls
                  </button>
                </div>
              </div>

              {/* Active Player Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Striker Name</label>
                  <input
                    type="text"
                    value={editStriker}
                    onChange={(e) => setEditStriker(e.target.value)}
                    placeholder="Striker player name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Non-Striker Name</label>
                  <input
                    type="text"
                    value={editNonStriker}
                    onChange={(e) => setEditNonStriker(e.target.value)}
                    placeholder="Non-striker player name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Bowler Name</label>
                  <input
                    type="text"
                    value={editBowler}
                    onChange={(e) => setEditBowler(e.target.value)}
                    placeholder="Bowler player name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Match Result Banner Override */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Official Match Result Text Override
                </label>
                <input
                  type="text"
                  value={editResultText}
                  onChange={(e) => setEditResultText(e.target.value)}
                  placeholder="e.g. Thunderbolts won by 14 runs or Strikers need 24 runs in 12 balls"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveScorecard}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center space-x-1.5"
                >
                  <Save size={14} className={isSaving ? 'animate-spin' : ''} />
                  <span>{isSaving ? 'Saving Scorecard...' : 'Save Scorecard Override'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: TEAMS & ROSTER */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Team A Roster */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      {teamAName} Squad
                    </h4>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {teams.A?.players?.length || 0} Players
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {teams.A?.players && teams.A.players.length > 0 ? (
                      teams.A.players.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <span className="font-bold text-slate-800">
                            {typeof p === 'object' ? p.name || p.id : p}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">Player #{idx + 1}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 py-4 text-center">
                        No players assigned to {teamAName} yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Team B Roster */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      {teamBName} Squad
                    </h4>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {teams.B?.players?.length || 0} Players
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {teams.B?.players && teams.B.players.length > 0 ? (
                      teams.B.players.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <span className="font-bold text-slate-800">
                            {typeof p === 'object' ? p.name || p.id : p}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">Player #{idx + 1}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 py-4 text-center">
                        No players assigned to {teamBName} yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* All Registered Participants */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-3">
                  All Joined Players (Via Join Code: {match.joinCode || 'N/A'})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {match.players && match.players.length > 0 ? (
                    match.players.map((uid, idx) => {
                      const name = match.playerNames?.[uid] || `Player ${idx + 1}`;
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl text-xs font-bold text-slate-800"
                        >
                          <Users size={12} className="text-blue-500" />
                          <span>{name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({uid})</span>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400">No players registered.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FIXTURE DETAILS & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Match Venue & Schedule Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update venue location, date, time, and sport type for this tournament match fixture.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Venue / Arena Name</label>
                  <input
                    type="text"
                    value={editPlace}
                    onChange={(e) => setEditPlace(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Sport Type</label>
                  <select
                    value={editSport}
                    onChange={(e) => setEditSport(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Cricket">Cricket</option>
                    <option value="Football">Football</option>
                    <option value="Badminton">Badminton</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Volleyball">Volleyball</option>
                    <option value="Basketball">Basketball</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Match Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Match Time</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center space-x-1.5"
                >
                  <Save size={14} className={isSaving ? 'animate-spin' : ''} />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Fixture Details'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100/80 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px] font-medium">
            Super Admin Control Center • All changes are synchronized live with player apps
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition shadow-sm"
          >
            Close Modal
          </button>
        </div>

      </div>
    </div>
  );
};
