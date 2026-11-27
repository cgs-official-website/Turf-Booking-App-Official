import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import {
    LifeBuoy,
    Send,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    MessageSquare,
    ArrowLeft,
    RefreshCw,
    Plus,
} from 'lucide-react';

const LIST_POLL_MS = 20000;
const THREAD_POLL_MS = 15000;

// Zuna ticket ids are long; show a short, readable reference
const shortId = (id) => String(id || '').slice(-6).toUpperCase();

const formatDateTime = (val) => {
    if (!val) return '';
    const d = new Date(val);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
};

const STATUS_STYLES = {
    OPEN: { label: 'Open', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    IN_PROGRESS: { label: 'In Progress', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Loader2 },
    RESOLVED: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    CLOSED: { label: 'Closed', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle2 },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_STYLES[status] || STATUS_STYLES.OPEN;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-extrabold ${cfg.cls}`}>
            <Icon size={11} className={status === 'IN_PROGRESS' ? 'animate-spin' : ''} />
            {cfg.label}
        </span>
    );
};

const PRIORITY_CLS = {
    LOW: 'text-slate-500',
    MEDIUM: 'text-sky-600',
    HIGH: 'text-orange-600',
    URGENT: 'text-rose-600',
};

export const ZunaSupportView = ({ unreadIds = new Set(), markTicketSeen, markAllSeen }) => {
    const [tab, setTab] = useState('raise'); // 'raise' | 'history'

    // Raise form
    const [subject, setSubject] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    // History
    const [tickets, setTickets] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [listError, setListError] = useState('');
    const [selected, setSelected] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [replyError, setReplyError] = useState('');

    const loadTickets = useCallback(async () => {
        try {
            const res = await api.getZunaTickets({ limit: 100 });
            setTickets(Array.isArray(res?.data) ? res.data : []);
            setListError('');
        } catch (err) {
            setListError(err.message || 'Could not load your tickets from Zuna.');
        } finally {
            setLoadingList(false);
        }
    }, []);

    const loadThread = useCallback(async (ticketId) => {
        try {
            const res = await api.getZunaTicket(ticketId);
            if (res?.data) {
                setSelected((current) => (current && current.id === ticketId ? res.data : current));
                // The admin is looking at this conversation, so its new reply/status counts as seen
                if (markTicketSeen) markTicketSeen(res.data);
            }
        } catch (err) {
            setReplyError(err.message || 'Could not load this conversation.');
        }
    }, [markTicketSeen]);

    // Keep ticket list fresh (picks up status changes made by Zuna)
    useEffect(() => {
        loadTickets();
        const timer = setInterval(loadTickets, LIST_POLL_MS);
        return () => clearInterval(timer);
    }, [loadTickets]);

    // Keep the open conversation fresh (picks up Zuna replies)
    useEffect(() => {
        if (!selected?.id) return undefined;
        const ticketId = selected.id;
        const timer = setInterval(() => loadThread(ticketId), THREAD_POLL_MS);
        return () => clearInterval(timer);
    }, [selected?.id, loadThread]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError('');
        setFormSuccess('');
        try {
            const res = await api.createZunaTicket({
                subject: subject.trim(),
                description: description.trim(),
                priority,
            });
            const ticketId = res?.data?.ticketId;
            setFormSuccess(`Ticket #${shortId(ticketId)} sent to Zuna Support. We will reply here.`);
            setSubject('');
            setDescription('');
            setPriority('MEDIUM');
            loadTickets();
            setTimeout(() => {
                setFormSuccess('');
                setTab('history');
            }, 1500);
        } catch (err) {
            setFormError(err.message || 'Could not submit the ticket. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const openTicket = (ticket) => {
        setReplyError('');
        setReplyText('');
        setSelected({ ...ticket, messages: ticket.messages || [] });
        if (markTicketSeen) markTicketSeen(ticket);
        loadThread(ticket.id);
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !selected) return;
        setSending(true);
        setReplyError('');
        try {
            await api.replyZunaTicket(selected.id, replyText.trim());
            setReplyText('');
            await loadThread(selected.id);
            loadTickets();
        } catch (err) {
            setReplyError(err.message || 'Could not send your reply.');
        } finally {
            setSending(false);
        }
    };

    const openCount = tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
                        <LifeBuoy size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold text-slate-900">Zuna Support</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Report software or technical problems (app crash, payment gateway, server errors) directly to the Zuna team.
                        </p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs self-start sm:self-auto">
                    <button
                        onClick={() => setTab('raise')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${tab === 'raise' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Plus size={13} /> Raise Ticket
                    </button>
                    <button
                        onClick={() => {
                            setSelected(null);
                            setTab('history');
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${tab === 'history' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <MessageSquare size={13} /> My Tickets ({tickets.length})
                        {openCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700">{openCount} open</span>
                        )}
                        {unreadIds.size > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-600 text-white">{unreadIds.size} new</span>
                        )}
                    </button>
                </div>
            </div>

            {/* RAISE TICKET */}
            {tab === 'raise' && (
                <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4 max-w-2xl">
                    {formError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={15} /> {formError}
                        </div>
                    )}
                    {formSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 size={15} /> {formSuccess}
                        </div>
                    )}

                    <div>
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Issue subject</label>
                        <input
                            type="text"
                            required
                            minLength={3}
                            maxLength={255}
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g. Razorpay payments failing since morning"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Product</label>
                            <input
                                type="text"
                                value="Turf Booking System"
                                readOnly
                                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 font-semibold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Detailed description</label>
                        <textarea
                            required
                            minLength={5}
                            maxLength={5000}
                            rows={5}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What happened? Which screen or app (User app, Vendor app, Admin panel)? Steps to reproduce, and any error message you saw."
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-y"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] text-slate-500">
                            For player or vendor booking problems, use <span className="font-bold">Issue Reports</span>. This desk is for software issues.
                        </p>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-700 transition flex items-center gap-2 disabled:opacity-60 cursor-pointer shrink-0"
                        >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            {submitting ? 'Sending...' : 'Submit to Zuna'}
                        </button>
                    </div>
                </form>
            )}

            {/* MY TICKETS: LIST */}
            {tab === 'history' && !selected && (
                <div className="space-y-3">
                    <div className="flex justify-end gap-2">
                        {unreadIds.size > 0 && markAllSeen && (
                            <button
                                onClick={markAllSeen}
                                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-xs font-semibold rounded-xl text-teal-700 transition flex items-center gap-1.5 border border-teal-200 cursor-pointer"
                            >
                                <CheckCircle2 size={12} /> Mark all as read
                            </button>
                        )}
                        <button
                            onClick={loadTickets}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                        >
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>

                    {listError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={15} /> {listError}
                        </div>
                    )}

                    {loadingList ? (
                        <div className="py-16 text-center text-slate-500">
                            <Loader2 size={24} className="animate-spin mx-auto text-emerald-600 mb-2" />
                            <p className="text-xs">Loading your tickets from Zuna...</p>
                        </div>
                    ) : tickets.length === 0 && !listError ? (
                        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
                            <MessageSquare size={30} className="text-slate-300 mx-auto mb-2" />
                            <h3 className="text-slate-900 font-extrabold text-base">No tickets yet</h3>
                            <p className="text-slate-500 text-xs mt-1">Tickets you raise to Zuna will appear here with live status.</p>
                        </div>
                    ) : (
                        tickets.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => openTicket(t)}
                                className={`w-full text-left bg-white border rounded-2xl p-4 shadow-sm hover:shadow hover:border-emerald-300 transition cursor-pointer ${unreadIds.has(t.id) ? 'border-teal-400 ring-1 ring-teal-200' : 'border-slate-200/80'}`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-xs font-extrabold text-emerald-600">#{shortId(t.id)}</span>
                                        <span className={`text-sm text-slate-900 truncate ${unreadIds.has(t.id) ? 'font-extrabold' : 'font-bold'}`}>{t.subject}</span>
                                        {unreadIds.has(t.id) && (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-extrabold">New update</span>
                                        )}
                                    </div>
                                    <StatusBadge status={t.status} />
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{t.description}</p>
                                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-semibold">
                                    <span className={PRIORITY_CLS[t.priority] || ''}>{t.priority}</span>
                                    <span>{formatDateTime(t.createdAt)}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* MY TICKETS: CONVERSATION */}
            {tab === 'history' && selected && (
                <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden max-w-3xl">
                    <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <button
                                onClick={() => setSelected(null)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer shrink-0"
                                title="Back to tickets"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold text-emerald-600">#{shortId(selected.id)}</span>
                                    <StatusBadge status={selected.status} />
                                </div>
                                <h3 className="text-sm font-extrabold text-slate-900 mt-1 break-words">{selected.subject}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto bg-slate-50/60">
                        {/* Original description */}
                        <div className="flex flex-col items-end">
                            <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-emerald-600 text-white text-xs whitespace-pre-wrap">
                                {selected.description}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1">You, {formatDateTime(selected.createdAt)}</span>
                        </div>

                        {(selected.messages || []).map((m, i) => {
                            const fromZuna = m.sender === 'ADMIN';
                            return (
                                <div key={m.id || i} className={`flex flex-col ${fromZuna ? 'items-start' : 'items-end'}`}>
                                    <div
                                        className={`max-w-[85%] px-3.5 py-2.5 text-xs whitespace-pre-wrap ${fromZuna
                                            ? 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-md'
                                            : 'bg-emerald-600 text-white rounded-2xl rounded-br-md'
                                            }`}
                                    >
                                        {m.text}
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1">
                                        {fromZuna ? 'Zuna Support' : 'You'}, {formatDateTime(m.createdAt)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {replyError && (
                        <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle size={14} /> {replyError}
                        </div>
                    )}

                    <form onSubmit={handleReply} className="p-3 border-t border-slate-100 flex gap-2">
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            disabled={sending || selected.status === 'CLOSED'}
                            maxLength={5000}
                            placeholder={selected.status === 'CLOSED' ? 'This ticket is closed. Raise a new ticket.' : 'Write a reply to Zuna Support...'}
                            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
                        />
                        <button
                            type="submit"
                            disabled={sending || !replyText.trim() || selected.status === 'CLOSED'}
                            className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition disabled:opacity-50 flex items-center cursor-pointer"
                            title="Send reply"
                        >
                            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ZunaSupportView;
