// src/utils/matchStorage.js
// Offline-first Match/Team/Toss/Scorecard engine with real-time cloud sync.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '../api/client';

const MATCHES_KEY = '@turf_matches';
const RECENT_PLAYERS_KEY = '@turf_recent_players';

const genId = (prefix = 'm') =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

async function readJSON(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

async function writeJSON(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const matchStorage = {
  genId,

  async getAllMatches() {
    const all = await readJSON(MATCHES_KEY, {});
    return Object.values(all).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  async getMyMatches(statusFilter) {
    // 1. Read local copy first
    const all = await readJSON(MATCHES_KEY, {});
    let localMatches = Object.values(all);

    // 2. Try fetching latest user matches from backend
    try {
      const url = `/matches/mine${statusFilter ? `?status=${statusFilter}` : ''}`;
      const serverRes = await client.get(url);
      const serverList = serverRes?.matches || serverRes?.data || (Array.isArray(serverRes) ? serverRes : null);

      if (Array.isArray(serverList)) {
        serverList.forEach((m) => {
          if (m && m.id) {
            all[m.id] = { ...all[m.id], ...m };
          }
        });
        await writeJSON(MATCHES_KEY, all);

        let result = serverList;
        if (statusFilter) {
          result = result.filter((m) => (m.status || '').toLowerCase() === statusFilter.toLowerCase());
        }
        return result;
      }
    } catch (e) {
      // Offline fallback
    }

    if (statusFilter) {
      localMatches = localMatches.filter((m) => (m.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    return localMatches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  async getMatch(id) {
    if (!id) return null;
    // 1. Read local copy first (instant)
    const all = await readJSON(MATCHES_KEY, {});
    const local = all[id] || null;

    // 2. Fetch latest live match state from backend if online
    try {
      const serverRes = await client.get(`/matches/${id}`);
      const serverMatch = serverRes?.match || serverRes?.data;
      if (serverMatch) {
        // If local has rich player objects, preserve them so guest names/roles aren't overwritten by simple user IDs
        const localHasRichPlayers = Array.isArray(local?.players) && local.players.some((p) => typeof p === 'object');
        const mergedPlayers = localHasRichPlayers ? local.players : (serverMatch.players || local?.players || []);

        const localHasTeams = Boolean(local?.teams?.A?.playerIds?.length || local?.teams?.B?.playerIds?.length);
        const mergedTeams = localHasTeams ? local.teams : (serverMatch.teams || local?.teams);

        const merged = { ...serverMatch, ...local, players: mergedPlayers, teams: mergedTeams, id };
        all[id] = merged;
        await writeJSON(MATCHES_KEY, all);
        return merged;
      }
    } catch {
      // Offline fallback: return local copy
    }

    return local;
  },

  async saveMatch(match) {
    if (!match || !match.id) return match;

    // 1. Save locally immediately for offline-first zero-latency scoring
    const all = await readJSON(MATCHES_KEY, {});
    all[match.id] = match;
    await writeJSON(MATCHES_KEY, all);

    // 2. Sync to cloud backend in background for real-time live viewers & database persistence
    (async () => {
      try {
        await client.patch(`/matches/${match.id}/scorecard`, {
          scorecard: match.scorecard || match.innings || match.football || match.badminton || match.volleyball || match.basketball || match.tennis || {},
          status: match.status || 'live',
          teams: match.teams,
          toss: match.toss,
        });
      } catch (err) {
        // Offline / sync queued
      }
    })();

    return match;
  },

  async updateMatch(id, patch = {}) {
    const all = await readJSON(MATCHES_KEY, {});
    const existing = all[id] || { id, createdAt: Date.now() };
    const updated = { ...existing, ...patch, id };
    all[id] = updated;
    await writeJSON(MATCHES_KEY, all);

    (async () => {
      try {
        await client.patch(`/matches/${id}/scorecard`, {
          scorecard: updated.scorecard || updated.innings || updated.football || updated.badminton || updated.volleyball || updated.basketball || updated.tennis || {},
          status: updated.status || 'live',
          teams: updated.teams,
          toss: updated.toss,
        });
      } catch {}
    })();

    return updated;
  },

  async addTimeline(id, text) {
    const all = await readJSON(MATCHES_KEY, {});
    const m = all[id];
    if (!m) return;
    m.timeline = m.timeline || [];
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    m.timeline.unshift({ time: timeStr, text });
    all[id] = m;
    await writeJSON(MATCHES_KEY, all);
  },

  async deleteMatch(id) {
    const all = await readJSON(MATCHES_KEY, {});
    delete all[id];
    await writeJSON(MATCHES_KEY, all);
  },

  async createMatch(data = {}) {
    const localId = genId('match');
    const match = {
      id: localId,
      status: 'created', // created -> live -> completed
      createdAt: Date.now(),
      place: data.place || 'Turf Arena',
      sport: data.sport || 'Cricket',
      date: data.date || 'Today',
      time: data.time || '07:00 PM',
      playWithStrangers: !!data.playWithStrangers,
      bookingId: data.bookingId || null,
      turfId: data.turfId || null,
      overs: data.overs || 6,
      lastManEnabled: data.lastManEnabled ?? false,
      players: [], // [{ id, name, role }]
      teams: {
        A: { name: 'Team A', captainId: null, playerIds: [] },
        B: { name: 'Team B', captainId: null, playerIds: [] },
      },
      toss: null, // { wonBy: 'A'|'B', elected: 'bat'|'bowl' }
      innings: [], // [inning0, inning1]
      currentInningsIndex: 0,
      timeline: [], // [{ time, text }]
    };

    // Attempt synchronous backend match creation to acquire PostgreSQL match ID & join code
    try {
      const serverRes = await client.post('/matches', {
        id: localId,
        place: match.place,
        sport: match.sport,
        date: match.date,
        time: match.time,
        overs: match.overs,
        playWithStrangers: match.playWithStrangers,
        bookingId: match.bookingId,
        turfId: match.turfId,
        teams: match.teams,
      });

      const serverMatch = serverRes?.match || serverRes?.data;
      if (serverMatch?.id) {
        match.id = serverMatch.id;
        match.joinCode = serverMatch.joinCode;
      }
    } catch (err) {
      console.warn('Backend match creation sync failed (will store locally):', err);
    }

    const all = await readJSON(MATCHES_KEY, {});
    all[match.id] = match;
    await writeJSON(MATCHES_KEY, all);

    return match;
  },
};

export const playerStorage = {
  async getRecentPlayers() {
    const list = await readJSON(RECENT_PLAYERS_KEY, []);
    const dummyIds = new Set(['p_1', 'p_2', 'p_3', 'p_4']);
    const dummyNames = new Set(['madhan raj', 'karthik', 'suresh', 'venkatesh']);
    const filtered = (list || []).filter(
      (p) => p && !dummyIds.has(p.id) && !dummyNames.has(String(p.name || '').toLowerCase().trim())
    );
    if (filtered.length !== (list || []).length) {
      await writeJSON(RECENT_PLAYERS_KEY, filtered);
    }
    return filtered;
  },

  async addGuestPlayer({ name, phone }) {
    const guest = {
      id: genId('guest'),
      name: name.trim(),
      phone: phone ? phone.trim() : '',
      isGuest: true,
    };
    const list = await this.getRecentPlayers();
    const updated = [guest, ...list.filter((p) => p.name.toLowerCase().trim() !== guest.name.toLowerCase().trim())];
    await writeJSON(RECENT_PLAYERS_KEY, updated);
    return guest;
  },

  async addRecentPlayers(players = []) {
    const existing = await readJSON(RECENT_PLAYERS_KEY, []);
    const map = new Map();
    existing.forEach((p) => map.set(p.name.toLowerCase().trim(), p));
    players.forEach((p) => map.set(p.name.toLowerCase().trim(), p));
    const merged = Array.from(map.values()).slice(0, 30);
    await writeJSON(RECENT_PLAYERS_KEY, merged);
  },
};