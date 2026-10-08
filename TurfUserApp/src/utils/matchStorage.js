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

function mergeTeams(localTeams, serverTeams) {
  const localA = localTeams?.A?.playerIds || localTeams?.teamA?.playerIds || [];
  const localB = localTeams?.B?.playerIds || localTeams?.teamB?.playerIds || [];
  const serverA = serverTeams?.A?.playerIds || serverTeams?.teamA?.playerIds || [];
  const serverB = serverTeams?.B?.playerIds || serverTeams?.teamB?.playerIds || [];

  if (localA.length + localB.length > 0 && serverA.length + serverB.length === 0) {
    return localTeams;
  }
  if (serverA.length + serverB.length > 0) {
    return serverTeams;
  }
  return localTeams || serverTeams || { A: { name: 'Team A', playerIds: [] }, B: { name: 'Team B', playerIds: [] } };
}

export const matchStorage = {
  genId,

  async getAllMatches() {
    const all = await readJSON(MATCHES_KEY, {});
    return Object.values(all).sort((a, b) => new Date(b.createdAt || b.matchDate || 0) - new Date(a.createdAt || a.matchDate || 0));
  },

  async getMyMatches(statusFilter) {
    const all = await readJSON(MATCHES_KEY, {});
    let localMatches = Object.values(all);

    try {
      const url = `/matches/mine${statusFilter ? `?status=${statusFilter}` : ''}`;
      const serverRes = await client.get(url);
      const serverList = serverRes?.matches || serverRes?.data || (Array.isArray(serverRes) ? serverRes : null);

      if (Array.isArray(serverList)) {
        const syncedAll = {};
        serverList.forEach((m) => {
          if (m && m.id) {
            syncedAll[m.id] = { ...(all[m.id] || {}), ...m };
          }
        });
        await writeJSON(MATCHES_KEY, syncedAll);

        let result = Object.values(syncedAll);
        if (statusFilter) {
          result = result.filter((m) => (m.status || '').toLowerCase() === statusFilter.toLowerCase());
        }
        return result.sort((a, b) => new Date(b.createdAt || b.matchDate || 0) - new Date(a.createdAt || a.matchDate || 0));
      }
    } catch (e) {
      // Offline fallback
    }

    if (statusFilter) {
      localMatches = localMatches.filter((m) => (m.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    return localMatches.sort((a, b) => new Date(b.createdAt || b.matchDate || 0) - new Date(a.createdAt || a.matchDate || 0));
  },

  async getMatch(id) {
    if (!id) return null;
    const all = await readJSON(MATCHES_KEY, {});
    const local = all[id] || null;

    try {
      const serverRes = await client.get(`/matches/${id}`);
      const serverMatch = serverRes?.match || serverRes?.data;
      if (serverMatch) {
        const localPlayers = Array.isArray(local?.players) && local.players.length > 0 ? local.players : null;
        const serverPlayers = Array.isArray(serverMatch.players) && serverMatch.players.length > 0 ? serverMatch.players : null;
        const mergedPlayers = localPlayers || serverPlayers || [];

        const mergedTeams = mergeTeams(local?.teams, serverMatch.teams);

        const mergedPlayerNames = {
          ...(local?.playerNames || {}),
          ...(serverMatch.playerNames || {}),
        };

        const merged = {
          ...(local || {}),
          ...serverMatch,
          players: mergedPlayers,
          teams: mergedTeams,
          playerNames: mergedPlayerNames,
          id,
        };

        all[id] = merged;
        await writeJSON(MATCHES_KEY, all);
        return merged;
      }
    } catch (err) {
      const isNotFound = err?.message && (err.message.includes('404') || err.message.toLowerCase().includes('not found'));
      if (isNotFound) {
        delete all[id];
        await writeJSON(MATCHES_KEY, all);
        return null;
      }
    }

    return local;
  },

  async saveMatch(match) {
    if (!match || !match.id) return match;

    const all = await readJSON(MATCHES_KEY, {});
    all[match.id] = match;
    await writeJSON(MATCHES_KEY, all);

    try {
      const payload = {
        scorecard: match.scorecard || match.innings || match.football || match.badminton || match.volleyball || match.basketball || match.tennis || {},
        status: match.status || 'live',
        teams: match.teams,
        toss: match.toss,
      };
      if (match.resultText || match.result) {
        payload.resultText = match.resultText || match.result;
      }
      const res = await client.patch(`/matches/${match.id}/scorecard`, payload);
      const serverMatch = res?.match || res?.data;
      if (serverMatch && serverMatch.id) {
        const localPlayers = Array.isArray(match.players) && match.players.length > 0 ? match.players : null;
        const serverPlayers = Array.isArray(serverMatch.players) && serverMatch.players.length > 0 ? serverMatch.players : null;
        const mergedPlayers = localPlayers || serverPlayers || [];
        const mergedTeams = mergeTeams(match.teams, serverMatch.teams);
        const mergedPlayerNames = {
          ...(match.playerNames || {}),
          ...(serverMatch.playerNames || {}),
        };

        all[match.id] = {
          ...match,
          ...serverMatch,
          players: mergedPlayers,
          teams: mergedTeams,
          playerNames: mergedPlayerNames,
        };
        await writeJSON(MATCHES_KEY, all);
        return all[match.id];
      }
    } catch (err) {
      console.warn('saveMatch backend sync notice:', err?.message || err);
    }

    return match;
  },

  async updateMatch(id, patch = {}) {
    const all = await readJSON(MATCHES_KEY, {});
    const existing = all[id] || { id, createdAt: Date.now() };
    const updated = { ...existing, ...patch, id };
    all[id] = updated;
    await writeJSON(MATCHES_KEY, all);

    try {
      const payload = {
        scorecard: updated.scorecard || updated.innings || updated.football || updated.badminton || updated.volleyball || updated.basketball || updated.tennis || {},
        status: updated.status || 'live',
        teams: updated.teams,
        toss: updated.toss,
      };
      if (updated.resultText || updated.result) {
        payload.resultText = updated.resultText || updated.result;
      }
      const res = await client.patch(`/matches/${id}/scorecard`, payload);
      const serverMatch = res?.match || res?.data;
      if (serverMatch && serverMatch.id) {
        const localPlayers = Array.isArray(updated.players) && updated.players.length > 0 ? updated.players : null;
        const serverPlayers = Array.isArray(serverMatch.players) && serverMatch.players.length > 0 ? serverMatch.players : null;
        const mergedPlayers = localPlayers || serverPlayers || [];
        const mergedTeams = mergeTeams(updated.teams, serverMatch.teams);
        const mergedPlayerNames = {
          ...(updated.playerNames || {}),
          ...(serverMatch.playerNames || {}),
        };

        all[id] = {
          ...updated,
          ...serverMatch,
          players: mergedPlayers,
          teams: mergedTeams,
          playerNames: mergedPlayerNames,
        };
        await writeJSON(MATCHES_KEY, all);
        return all[id];
      }
    } catch (err) {
      console.warn('updateMatch backend sync notice:', err?.message || err);
    }

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