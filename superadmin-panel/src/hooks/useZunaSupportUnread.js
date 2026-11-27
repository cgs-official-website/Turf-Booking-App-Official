import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';

/**
 * Tracks which Zuna Support tickets have updates the Super Admin hasn't seen yet.
 *
 * A ticket is "unread" when Zuna has done something since the admin last looked:
 *   - Zuna replied    -> ticket.lastAdminReplyAt is newer than what was last seen
 *   - status changed  -> ticket.status differs from what was last seen
 *
 * Seen-state is kept in localStorage per admin email. It is polled every 20s,
 * and refreshed when the tab regains focus.
 */

const POLL_MS = 20000;

const readStore = (key) => {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
        return null;
    }
};

const writeStore = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* storage unavailable: badge just resets on reload */
    }
};

const snapshotOf = (t) => ({ status: t.status, reply: t.lastAdminReplyAt || null });

export function useZunaSupportUnread(userKey) {
    const storeKey = `zunaSupportSeen:${userKey || 'anon'}`;
    const [tickets, setTickets] = useState([]);
    const [seen, setSeen] = useState(() => readStore(storeKey));
    const seenRef = useRef(seen);
    seenRef.current = seen;

    // Reload seen-state if a different admin logs in on the same browser
    useEffect(() => {
        const stored = readStore(storeKey);
        seenRef.current = stored;
        setSeen(stored);
        setTickets([]);
    }, [storeKey]);

    const commit = useCallback(
        (next) => {
            seenRef.current = next;
            setSeen(next);
            writeStore(storeKey, next);
        },
        [storeKey]
    );

    const refresh = useCallback(async () => {
        if (!userKey) return;
        try {
            const res = await api.getZunaTickets({ limit: 100 });
            const list = Array.isArray(res?.data) ? res.data : [];
            setTickets(list);

            const current = seenRef.current;
            if (!current) {
                // First time on this browser: everything that already exists counts as seen
                commit(Object.fromEntries(list.map((t) => [t.id, snapshotOf(t)])));
            } else {
                // Tickets raised from here start as seen (OPEN, no reply yet)
                const fresh = list.filter((t) => !current[t.id]);
                if (fresh.length) {
                    commit({
                        ...current,
                        ...Object.fromEntries(fresh.map((t) => [t.id, { status: 'OPEN', reply: null }])),
                    });
                }
            }
        } catch {
            /* Zuna unreachable / not configured: keep last known badge */
        }
    }, [userKey, commit]);

    useEffect(() => {
        if (!userKey) return undefined;
        refresh();
        const tick = () => document.visibilityState === 'visible' && refresh();
        document.addEventListener('visibilitychange', tick);
        window.addEventListener('focus', tick);
        const timer = setInterval(tick, POLL_MS);
        return () => {
            document.removeEventListener('visibilitychange', tick);
            window.removeEventListener('focus', tick);
            clearInterval(timer);
        };
    }, [userKey, refresh]);

    const unreadIds = useMemo(() => {
        const ids = new Set();
        if (!seen) return ids;
        for (const t of tickets) {
            const s = seen[t.id];
            if (!s) continue;
            const newerReply = (t.lastAdminReplyAt || '') > (s.reply || '');
            if (t.status !== s.status || newerReply) ids.add(t.id);
        }
        return ids;
    }, [tickets, seen]);

    const markTicketSeen = useCallback(
        (ticket) => {
            if (!ticket?.id) return;
            commit({ ...(seenRef.current || {}), [ticket.id]: snapshotOf(ticket) });
            refresh();
        },
        [commit, refresh]
    );

    const markAllSeen = useCallback(() => {
        commit({
            ...(seenRef.current || {}),
            ...Object.fromEntries(tickets.map((t) => [t.id, snapshotOf(t)])),
        });
    }, [commit, tickets]);

    return { unreadCount: unreadIds.size, unreadIds, markTicketSeen, markAllSeen, refresh };
}

export default useZunaSupportUnread;
