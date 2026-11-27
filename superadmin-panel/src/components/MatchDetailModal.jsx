import React, { useState } from 'react';
import { api } from '../api/client';
import {
    Trophy, X, Calendar, Users, Key, Copy, Check, Trash2, Clock, Coins, MapPin, Activity, Swords,
} from 'lucide-react';
import { useModal } from '../context/ModalContext';

/**
 * Read-only match viewer for Super Admin.
 * The ONLY write action is Delete (moderation). No score / status editing.
 */
export const MatchDetailModal = ({ match, onClose, onUpdated }) => {
    const { showAlert, showConfirm } = useModal();
    const [tab, setTab] = useState('scoreboard');
    const [copied, setCopied] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const teams = match.teams || {};
    const scorecard = match.scorecard || {};
    const innings = Array.isArray(match.innings) && match.innings.length > 0
        ? match.innings
        : (Array.isArray(scorecard.innings) ? scorecard.innings : []);
    const status = (match.status || 'created').toLowerCase();
    const teamAName = teams.A?.name || 'Team A';
    const teamBName = teams.B?.name || 'Team B';
    const inn = [innings[0] || {}, innings[1] || {}];
    const [selInn, setSelInn] = useState(Number(match.currentInningsIndex) || 0);
    const balls = Array.isArray(inn[selInn]?.balls) ? inn[selInn].balls : [];
    const resultText = match.resultText || match.result || scorecard.resultText || '';

    const statusStyle =
        status === 'live' ? 'bg-emerald-600 text-white'
            : status === 'completed' ? 'bg-blue-600 text-white'
                : 'bg-amber-500 text-white';

    const copyCode = () => {
        if (!match.joinCode) return;
        navigator.clipboard.writeText(match.joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = async () => {
        const ok = await showConfirm({
            title: 'Delete Match',
            message: `Delete match "${match.place || match.id}"? Its scorecard and roster will be permanently removed.`,
            type: 'danger',
            confirmText: 'Delete Match',
        });
        if (!ok) return;
        setIsDeleting(true);
        try {
            const res = await api.deleteAdminMatch(match.id);
            if (res.success) {
                await showAlert({ title: 'Match Removed', message: 'Match deleted successfully.', type: 'success' });
                if (onUpdated) onUpdated(null, match.id);
                onClose();
            }
        } catch (err) {
            await showAlert({ title: 'Delete Failed', message: err.message || 'Failed to delete match', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const tabs = [
        { id: 'scoreboard', label: 'Scoreboard', icon: Activity },
        { id: 'roster', label: 'Teams & Roster', icon: Users },
        { id: 'details', label: 'Match Details', icon: Swords },
    ];

    const TeamScore = ({ name, data, index }) => {
        const rr = parseFloat(data.overs) > 0 ? (Number(data.runs || 0) / parseFloat(data.overs)).toFixed(2) : null;
        const active = status === 'live' && selInn === index;
        return (
            <button
                type="button"
                onClick={() => setSelInn(index)}
                className={`text-left p-4 rounded-2xl border transition ${selInn === index ? 'bg-white border-emerald-400 ring-2 ring-emerald-500/15 shadow-sm' : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
            >
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 truncate">{name}</span>
                    {active && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Batting</span>
                    )}
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-black text-slate-900 tracking-tight">{data.runs ?? 0}/{data.wickets ?? 0}</span>
                    <span className="text-xs text-slate-500 font-bold">({data.overs || '0.0'} ov)</span>
                </div>
                {rr && <div className="text-[11px] text-slate-500 mt-1">Run rate: <strong className="text-slate-800">{rr}</strong></div>}
            </button>
        );
    };

    const Roster = ({ name, players }) => (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide truncate">{name} Squad</h4>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">{players?.length || 0} Players</span>
            </div>
            <div className="mt-3 space-y-2">
                {players && players.length > 0 ? players.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-bold text-slate-800">{typeof p === 'object' ? p.name || p.id : p}</span>
                        <span className="text-[10px] font-mono text-slate-400">#{i + 1}</span>
                    </div>
                )) : <div className="text-xs text-slate-400 py-4 text-center">No players assigned yet.</div>}
            </div>
        </div>
    );

    const Row = ({ label, value }) => (
        <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
            <span className="text-slate-500 font-semibold">{label}</span>
            <span className="font-bold text-slate-900 text-right truncate max-w-[60%]">{value || '—'}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5" onClick={onClose}>
            <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-50 to-white p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-emerald-100">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0"><Trophy size={20} /></div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-extrabold text-[10px] uppercase tracking-wider">{match.sport || 'Cricket'}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusStyle}`}>{status}</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1 truncate">{match.place || match.turf?.name || '—'}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {match.joinCode && (
                            <div className="hidden sm:flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                                <Key size={12} className="text-amber-500" />
                                <span className="font-mono font-black text-slate-900 tracking-widest">{match.joinCode}</span>
                                <button onClick={copyCode} title="Copy join code" className="p-1 text-slate-400 hover:text-emerald-600 transition">
                                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                </button>
                            </div>
                        )}
                        <button onClick={handleDelete} disabled={isDeleting} title="Delete match" className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition disabled:opacity-50">
                            <Trash2 size={15} />
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"><X size={20} /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6">
                    {tabs.map((t) => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`py-3 px-3 sm:px-4 text-xs font-black border-b-2 transition flex items-center gap-1.5 ${tab === t.id ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                                <Icon size={14} /><span>{t.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50/50 space-y-4">
                    {tab === 'scoreboard' && (
                        <>
                            <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-100 space-y-3">
                                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                                    <span className="flex items-center gap-1"><Calendar size={13} className="text-emerald-600" />{match.matchDate || '—'} {match.matchTime ? `• ${match.matchTime}` : ''}</span>
                                    <span>Host: <strong className="text-emerald-700">{match.creatorName || '—'}</strong></span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <TeamScore name={teamAName} data={inn[0]} index={0} />
                                    <TeamScore name={teamBName} data={inn[1]} index={1} />
                                </div>
                                <div className="bg-white rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-200">
                                    <span className="flex items-center gap-1.5 text-slate-600">
                                        <Coins size={14} className="text-amber-500" />
                                        {match.toss?.decision
                                            ? <>Toss: <strong className="text-slate-900">{match.toss.winner || '—'}</strong> elected to <strong className="text-emerald-700">{match.toss.decision}</strong></>
                                            : <span className="text-slate-400">Toss not recorded yet</span>}
                                    </span>
                                    {resultText && (
                                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                            <Trophy size={13} /><span>{resultText}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Batters</div>
                                    <Row label="Striker *" value={scorecard.striker} />
                                    <Row label="Non-Striker" value={scorecard.nonStriker} />
                                </div>
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Bowler</div>
                                    <Row label="Bowler" value={scorecard.bowler} />
                                    <Row label="Innings" value={selInn === 0 ? '1st Innings' : '2nd Innings'} />
                                </div>
                            </div>

                            {balls.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                                        Ball-by-ball — {selInn === 0 ? teamAName : teamBName} ({balls.length} deliveries)
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {balls.map((b, i) => (
                                            <span key={i} className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black ${b === 'W' ? 'bg-rose-600 text-white' : b === '4' ? 'bg-blue-600 text-white' : b === '6' ? 'bg-emerald-600 text-white'
                                                    : b === 'Wd' || b === 'Nb' ? 'bg-amber-500 text-white' : b === '0' ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-800 border border-slate-200'}`}>{b}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'roster' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Roster name={teamAName} players={teams.A?.players} />
                                <Roster name={teamBName} players={teams.B?.players} />
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide mb-3">Joined players (join code: {match.joinCode || 'N/A'})</h4>
                                <div className="flex flex-wrap gap-2">
                                    {match.players && match.players.length > 0 ? match.players.map((uid, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl text-xs font-bold text-slate-800">
                                            <Users size={12} className="text-emerald-600" />{match.playerNames?.[uid] || `Player ${i + 1}`}
                                        </span>
                                    )) : <span className="text-xs text-slate-400">No players registered.</span>}
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'details' && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
                            <Row label="Match ID" value={match.id} />
                            <Row label="Sport" value={match.sport} />
                            <Row label="Venue" value={match.place || match.turf?.name} />
                            <Row label="Date" value={match.matchDate} />
                            <Row label="Time" value={match.matchTime} />
                            <Row label="Overs" value={match.overs ? `${match.overs}` : null} />
                            <Row label="Host" value={match.creatorName} />
                            <Row label="Join code" value={match.joinCode} />
                            <Row label="Created" value={match.createdAt ? new Date(match.createdAt).toLocaleString('en-IN') : null} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
